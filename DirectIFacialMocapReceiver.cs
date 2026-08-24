// WebGL(브라우저)에는 UDP 소켓과 백그라운드 스레드가 없다.
// 아래 심볼이 정의되면 네트워크 수신 경로 전체가 컴파일에서 제외되고,
// 블렌드셰이프 적용 / 애니메이터 페이드 / 슬라이더 UI 등 나머지 기능은 그대로 동작한다.
#if UNITY_WEBGL && !UNITY_EDITOR
#define FACIAL_NO_NETWORK
#endif

using UnityEngine;
#if !FACIAL_NO_NETWORK
using System.Net;
using System.Net.Sockets;
using System.Threading;
#endif
using System.Text;
using System.Collections.Generic;
using System.Globalization;
using System;

#if FINAL_IK
using RootMotion.FinalIK;
#endif

public enum HeadTrackingMode
{
    NoTracking,        // 헤드 트래킹 비활성화
    DirectRotation,    // VRIK 없이 직접 Head Bone 회전
#if FINAL_IK
    VRIKWithTarget     // VRIK의 HeadTarget 사용 (FinalIK 필요)
#endif
}

public class DirectIFacialMocapReceiver : MonoBehaviour
{
    [Header("Face Mesh Settings")]
    [SerializeField] private GameObject[] faceObjectGroups;
    [SerializeField] private bool debugLog = false;

    [Header("Network Settings")]
    [SerializeField] private int receivePort = 49983;

    [Header("Head Tracking Mode")]
    [SerializeField] private HeadTrackingMode headTrackingMode = HeadTrackingMode.DirectRotation;
    [SerializeField] private Transform headBone; // Animator의 Head Bone을 직접 할당

#if FINAL_IK
    [Header("Final IK Settings (VRIK Mode Only)")]
    [SerializeField] private VRIK vrik;
    [SerializeField] private Transform headTarget;
    [SerializeField] private float positionSmoothing = 15f;
    [SerializeField] private float positionScale = 1f;
#endif

    [Header("Direct Rotation Settings")]
    [SerializeField] private float rotationSmoothing = 15f;
    [SerializeField] private bool useLocalRotation = true; // 로컬 회전 사용 여부

    [Header("BlendShape Smoothing Settings")]
    [SerializeField] private float blendShapeSmoothing = 30f;
    [SerializeField] private bool enableBlendShapeSmoothing = true;
    [SerializeField] private UnityEngine.UI.Slider blendShapeSmoothingSlider;

    [Header("Signal Loss Recovery")]
    [Tooltip("신호 끊김 시 애니메이터 레이어 애니메이션으로 페이드아웃 기능 활성화")]
    [SerializeField] private bool enableSignalLossRecovery = true;
    [Tooltip("이 시간(초) 동안 BlendShape 값 변화가 없으면 '신호 끊김'으로 판단.\niFacialMocap은 얼굴 인식이 끊겨도 마지막 값을 freeze해서 계속 송신하므로,\n패킷 도착 여부가 아니라 값 변화 여부로 판단한다.")]
    [SerializeField] private float signalTimeoutThreshold = 0.5f;
    [Tooltip("신호 끊김 후 애니메이터로 돌아가는 페이드아웃 시간(초)")]
    [SerializeField] private float returnToAnimationDuration = 1.5f;
    [Tooltip("신호 복귀 시 트래킹으로 돌아오는 페이드인 시간(초)")]
    [SerializeField] private float returnFromAnimationDuration = 0.3f;
    [Tooltip("BlendShape 값 변화 감지 임계값 (iFacialMocap weight 단위 0~100 기준).\n이 값보다 작은 변화는 '멈춤'으로 간주. 트래킹 시 노이즈가 보통 0.05~0.2 수준이므로\n0.01~0.1 사이 권장. 너무 작으면 freeze 상태도 활동으로 오인할 수 있다.")]
    [SerializeField] private float blendShapeChangeThreshold = 0.05f;
    [Tooltip("신호 끊김 후 얼굴 표정이 0으로 복귀하는 보간 속도")]
    [Range(1f, 60f)]
    [SerializeField] private float afkReturnSpeed = 15f;

    [Header("Control Settings")]
    [SerializeField] private KeyCode pauseKey = KeyCode.F;
    [SerializeField] private KeyCode resetKey = KeyCode.T;
    [SerializeField] private KeyCode toggleUDPKey = KeyCode.U; // UDP 토글 키 추가

    [Header("UDP Control")]
    [SerializeField] private bool startUDPOnEnable = true; // 시작 시 UDP 자동 활성화

    [Header("Slider Settings")]
    [SerializeField] private float minPositionScale = 0.1f;
    [SerializeField] private float maxPositionScale = 1f;
    [SerializeField] private float minBlendShapeSmoothing = 0f;
    [SerializeField] private float maxBlendShapeSmoothing = 50f;

    [Header("Sensitivity Settings")]
    [SerializeField] private List<BlendShapeSensitivitySetting> sensitivitySettings = new List<BlendShapeSensitivitySetting>();

    private Dictionary<string, float> blendShapeSensitivityCache = new Dictionary<string, float>();
    private bool isTrackingPaused = false;

    // LoadSettings가 완료되기 전에는 저장을 차단
    // (초기화 전 OnDisable 등이 기본값으로 저장값을 덮어쓰는 것을 방지)
    private bool settingsLoaded = false;

    private Vector3 receivedPosition;
    private Quaternion receivedRotation;
    private Vector3 targetPosition;
    private Quaternion targetRotation;
    private Vector3 currentHeadPosition;
    private Quaternion currentHeadRotation;

    private Dictionary<string, float> pausedBlendShapeValues;
    private Dictionary<string, float> targetBlendShapeValues;
    private Dictionary<string, float> currentBlendShapeValues;

    private Vector3 defaultHeadLocalPosition;
    private Quaternion defaultHeadLocalRotation;

    private Vector3 positionOffset;
    private Quaternion rotationOffset;
    private bool offsetInitialized = false;

#if !FACIAL_NO_NETWORK
    private UdpClient receiver;
    private Thread receiveThread;
    private bool isRunning = false;
#endif
    private string currentMessage = "";
    private List<SkinnedMeshRenderer> meshTargetList;

    private int lastReceivePort;
    private bool isUDPActive = false; // UDP 활성화 상태

    // ===== Signal Loss Recovery =====
    private Dictionary<string, float> lastReceivedBlendShapeValues;
    private float lastSignalTime = -1f;
    private bool isSignalLost = false;
    private float trackingWeight = 1f;

    // Direct Rotation 모드를 위한 변수들
    private Quaternion defaultHeadBoneRotation; // Head Bone의 원래 회전값
    private bool headBoneInitialized = false;

    // ===== GC 최적화를 위한 블렌드셰이프 캐싱 =====
    private Dictionary<string, List<BlendShapeTarget>> blendShapeCache;
    private bool blendShapeCacheInitialized = false;
    private List<string> cachedARKitBlendShapeNames;

    private struct BlendShapeTarget
    {
        public SkinnedMeshRenderer renderer;
        public int blendShapeIndex;

        public BlendShapeTarget(SkinnedMeshRenderer renderer, int index)
        {
            this.renderer = renderer;
            this.blendShapeIndex = index;
        }
    }

    private Dictionary<string, string> nameMappingCache;

    private static readonly HashSet<string> arkitBlendShapeNames = new HashSet<string>
    {
        "browDownLeft", "browDownRight", "browInnerUp", "browOuterUpLeft", "browOuterUpRight",
        "cheekPuff", "cheekSquintLeft", "cheekSquintRight",
        "eyeBlinkLeft", "eyeBlinkRight", "eyeLookDownLeft", "eyeLookDownRight",
        "eyeLookInLeft", "eyeLookInRight", "eyeLookOutLeft", "eyeLookOutRight",
        "eyeLookUpLeft", "eyeLookUpRight", "eyeSquintLeft", "eyeSquintRight",
        "eyeWideLeft", "eyeWideRight",
        "jawForward", "jawLeft", "jawRight", "jawOpen",
        "mouthClose", "mouthDimpleLeft", "mouthDimpleRight",
        "mouthFrownLeft", "mouthFrownRight", "mouthFunnel",
        "mouthLeft", "mouthRight",
        "mouthLowerDownLeft", "mouthLowerDownRight",
        "mouthPressLeft", "mouthPressRight", "mouthPucker",
        "mouthRollLower", "mouthRollUpper",
        "mouthShrugLower", "mouthShrugUpper",
        "mouthSmileLeft", "mouthSmileRight",
        "mouthStretchLeft", "mouthStretchRight",
        "mouthUpperUpLeft", "mouthUpperUpRight",
        "noseSneerLeft", "noseSneerRight",
        "tongueOut"
    };

    private bool IsARKitBlendShape(string blendShapeName)
    {
        return arkitBlendShapeNames.Contains(blendShapeName);
    }

    public void EnableUDP()
    {
#if FACIAL_NO_NETWORK
        isUDPActive = false;
        if (debugLog)
        {
            Debug.Log("[FacialMocap] UDP receive is unavailable on WebGL. Live tracking input is disabled.");
        }
#else
        if (!isUDPActive)
        {
            InitializeUDP();
            isUDPActive = true;
            if (debugLog)
            {
                Debug.Log($"UDP enabled on port {receivePort}");
            }
        }
#endif
    }

    public void DisableUDP()
    {
        if (isUDPActive)
        {
            CleanUpUDP();
            isUDPActive = false;
            if (debugLog)
            {
                Debug.Log($"UDP disabled on port {receivePort}");
            }
        }
    }

    public void ToggleUDP()
    {
        if (isUDPActive)
        {
            DisableUDP();
        }
        else
        {
            EnableUDP();
        }
    }

    public bool IsUDPActive
    {
        get { return isUDPActive; }
    }

    public void ToggleTracking()
    {
        isTrackingPaused = !isTrackingPaused;

        if (isTrackingPaused)
        {
            SaveCurrentBlendShapeValues();
            if (debugLog)
            {
                Debug.Log("Facial tracking paused");
            }
        }
        else
        {
            if (debugLog)
            {
                Debug.Log("Facial tracking resumed");
            }
        }
    }

    private void SaveCurrentBlendShapeValues()
    {
        if (pausedBlendShapeValues == null)
            pausedBlendShapeValues = new Dictionary<string, float>();

        pausedBlendShapeValues.Clear();

        if (blendShapeCacheInitialized && blendShapeCache != null)
        {
            foreach (var kvp in blendShapeCache)
            {
                string blendShapeName = kvp.Key;
                var targets = kvp.Value;

                if (targets.Count > 0 && targets[0].renderer != null)
                {
                    float currentWeight = targets[0].renderer.GetBlendShapeWeight(targets[0].blendShapeIndex);

                    if (!pausedBlendShapeValues.ContainsKey(blendShapeName))
                    {
                        pausedBlendShapeValues[blendShapeName] = currentWeight;
                    }
                }
            }
        }
        else
        {
            foreach (SkinnedMeshRenderer meshTarget in meshTargetList)
            {
                if (meshTarget != null && meshTarget.sharedMesh != null)
                {
                    for (int i = 0; i < meshTarget.sharedMesh.blendShapeCount; i++)
                    {
                        string blendShapeName = meshTarget.sharedMesh.GetBlendShapeName(i);
                        float currentWeight = meshTarget.GetBlendShapeWeight(i);

                        if (!pausedBlendShapeValues.ContainsKey(blendShapeName))
                        {
                            pausedBlendShapeValues[blendShapeName] = currentWeight;
                        }
                    }
                }
            }
        }
    }

    public bool IsTrackingPaused
    {
        get { return isTrackingPaused; }
    }

    public void PauseTracking()
    {
        if (!isTrackingPaused)
        {
            ToggleTracking();
        }
    }

    public void ResumeTracking()
    {
        if (isTrackingPaused)
        {
            ToggleTracking();
        }
    }

#if FINAL_IK
    public void SetPositionScale(float value)
    {
        positionScale = Mathf.Lerp(minPositionScale, maxPositionScale, value);

        if (debugLog)
        {
            Debug.Log($"Position scale updated to: {positionScale}");
        }
    }

    public float GetPositionScale()
    {
        return positionScale;
    }

    public float GetNormalizedPositionScale()
    {
        return Mathf.InverseLerp(minPositionScale, maxPositionScale, positionScale);
    }
#endif

    public void SetBlendShapeSmoothing(float value)
    {
        blendShapeSmoothing = Mathf.Clamp(value, minBlendShapeSmoothing, maxBlendShapeSmoothing);

        if (blendShapeSmoothingSlider != null)
        {
            if (Mathf.Abs(blendShapeSmoothingSlider.value - value) > 0.0001f)
            {
                blendShapeSmoothingSlider.value = value;
            }
        }

        // 로드 완료 이후의 변경은 즉시 기록 (종료 타이밍에 의존하지 않도록)
        if (settingsLoaded)
        {
            PlayerPrefs.SetFloat(SmoothingPrefKey, blendShapeSmoothing);
        }

        if (debugLog)
        {
            Debug.Log($"BlendShape smoothing updated to: {blendShapeSmoothing}");
        }
    }

    public float GetBlendShapeSmoothing()
    {
        return blendShapeSmoothing;
    }

    public float GetNormalizedBlendShapeSmoothing()
    {
        return Mathf.InverseLerp(minBlendShapeSmoothing, maxBlendShapeSmoothing, blendShapeSmoothing);
    }

    private float GetBlendShapeSmoothingSpeed()
    {
        return blendShapeSmoothing;
    }

    public void SetBlendShapeSmoothingEnabled(bool enabled)
    {
        enableBlendShapeSmoothing = enabled;

        if (debugLog)
        {
            Debug.Log($"BlendShape smoothing {(enabled ? "enabled" : "disabled")}");
        }
    }

    public bool IsBlendShapeSmoothingEnabled()
    {
        return enableBlendShapeSmoothing;
    }

    private bool IsValidQuaternion(Quaternion q)
    {
        return !float.IsNaN(q.x) && !float.IsNaN(q.y) && !float.IsNaN(q.z) && !float.IsNaN(q.w) &&
               !float.IsInfinity(q.x) && !float.IsInfinity(q.y) && !float.IsInfinity(q.z) && !float.IsInfinity(q.w);
    }

    private bool IsValidVector3(Vector3 v)
    {
        return !float.IsNaN(v.x) && !float.IsNaN(v.y) && !float.IsNaN(v.z) &&
               !float.IsInfinity(v.x) && !float.IsInfinity(v.y) && !float.IsInfinity(v.z);
    }

    private void OnValidate()
    {
        if (faceObjectGroups == null || faceObjectGroups.Length == 0)
        {
            UnityEngine.Debug.LogWarning("No Face Object Groups assigned!");
        }

#if FINAL_IK
        if (headTrackingMode == HeadTrackingMode.VRIKWithTarget)
        {
            if (vrik == null)
            {
                vrik = GetComponent<VRIK>();
                if (vrik == null && debugLog)
                {
                    UnityEngine.Debug.LogWarning("VRIK component not found. Please assign it or change Head Tracking Mode.");
                }
            }
        }
        else
#endif
        if (headTrackingMode == HeadTrackingMode.DirectRotation)
        {
            if (headBone == null && debugLog)
            {
                UnityEngine.Debug.LogWarning("Head Bone not assigned for Direct Rotation mode. Attempting to find it...");
                TryFindHeadBone();
            }
        }

        if (UnityEngine.Application.isPlaying && lastReceivePort != receivePort)
        {
            if (debugLog)
            {
                UnityEngine.Debug.Log($"Port changed from {lastReceivePort} to {receivePort}, restarting UDP...");
            }
            RestartUDP();
        }

        UpdateSensitivityCache();
    }

    private void TryFindHeadBone()
    {
        Animator animator = GetComponent<Animator>();
        if (animator != null && animator.isHuman)
        {
            headBone = animator.GetBoneTransform(HumanBodyBones.Head);
            if (headBone != null && debugLog)
            {
                UnityEngine.Debug.Log($"Found Head Bone: {headBone.name}");
            }
        }
    }

#if FACIAL_NO_NETWORK
    private void RestartUDP() { }
    private void CleanUpUDP() { }
#else
    private void RestartUDP()
    {
        CleanUpUDP();
        InitializeUDP();

        if (debugLog)
        {
            UnityEngine.Debug.Log($"UDP restarted on new port: {receivePort}");
        }
    }

    private void CleanUpUDP()
    {
        isRunning = false;

        if (receiveThread != null && receiveThread.IsAlive)
        {
            try
            {
                receiveThread.Join(500);

                if (receiveThread.IsAlive)
                {
                    receiveThread.Abort();
                    receiveThread.Join(1000);
                }
            }
            catch (System.Exception e)
            {
                if (debugLog)
                {
                    UnityEngine.Debug.LogError($"Error stopping receive thread: {e.Message}");
                }
            }
            finally
            {
                receiveThread = null;
            }
        }

        if (receiver != null)
        {
            try
            {
                if (receiver.Client != null)
                {
                    receiver.Client.Close();
                }
                receiver.Close();
            }
            catch (System.Exception e)
            {
                if (debugLog)
                {
                    UnityEngine.Debug.LogError($"Error closing UDP receiver: {e.Message}");
                }
            }
            finally
            {
                receiver = null;
            }
        }

        if (UnityEngine.Application.isPlaying)
        {
            System.Threading.Thread.Sleep(100);
        }
    }
#endif

    void OnEnable()
    {
        if (meshTargetList != null && meshTargetList.Count > 0 && startUDPOnEnable)
        {
            if (debugLog)
            {
                UnityEngine.Debug.Log("Component re-enabled, restarting UDP connection...");
            }
            EnableUDP();
        }
    }

    void Start()
    {
        meshTargetList = new List<SkinnedMeshRenderer>();
        pausedBlendShapeValues = new Dictionary<string, float>();
        targetBlendShapeValues = new Dictionary<string, float>();
        currentBlendShapeValues = new Dictionary<string, float>();
        nameMappingCache = new Dictionary<string, string>();
        lastReceivedBlendShapeValues = new Dictionary<string, float>();

        lastReceivePort = receivePort;

        FindFaceMeshes();
        InitializeBlendShapeCache();
        cachedARKitBlendShapeNames = new List<string>(arkitBlendShapeNames);
        InitializeSensitivitySliders();
        InitializeSmoothingSlider();
        LoadSettings();
        UpdateSensitivityCache();
        InitializeBlendShapeValues();

        if (startUDPOnEnable)
        {
            EnableUDP();
        }

        InitializeHeadTracking();
    }

    void InitializeHeadTracking()
    {
        switch (headTrackingMode)
        {
            case HeadTrackingMode.NoTracking:
                if (debugLog)
                {
                    UnityEngine.Debug.Log("Head tracking disabled");
                }
                break;

            case HeadTrackingMode.DirectRotation:
                InitializeDirectRotation();
                break;

#if FINAL_IK
            case HeadTrackingMode.VRIKWithTarget:
                InitializeIK();
                break;
#endif
        }
    }

    void InitializeDirectRotation()
    {
        if (headBone == null)
        {
            TryFindHeadBone();
        }

        if (headBone == null)
        {
            UnityEngine.Debug.LogError("Head Bone not assigned and could not be found automatically!");
            return;
        }

        if (useLocalRotation)
        {
            defaultHeadBoneRotation = headBone.localRotation;
            currentHeadRotation = headBone.localRotation;
        }
        else
        {
            defaultHeadBoneRotation = headBone.rotation;
            currentHeadRotation = headBone.rotation;
        }

        headBoneInitialized = true;

        if (debugLog)
        {
            UnityEngine.Debug.Log($"Initialized Direct Rotation mode with head bone: {headBone.name}");
            UnityEngine.Debug.Log($"Default rotation: {defaultHeadBoneRotation.eulerAngles}");
        }
    }

    void FindFaceMeshes()
    {
        if (meshTargetList == null)
            meshTargetList = new List<SkinnedMeshRenderer>();

        meshTargetList.Clear();

        if (faceObjectGroups != null && faceObjectGroups.Length > 0)
        {
            foreach (GameObject group in faceObjectGroups)
            {
                if (group != null)
                {
                    SkinnedMeshRenderer[] renderers = group.GetComponentsInChildren<SkinnedMeshRenderer>();
                    foreach (SkinnedMeshRenderer renderer in renderers)
                    {
                        if (HasBlendShapes(renderer))
                        {
                            meshTargetList.Add(renderer);
                            if (debugLog)
                            {
                                UnityEngine.Debug.Log($"Found valid mesh: {renderer.gameObject.name} in group: {group.name}");
                            }
                        }
                    }
                }
                else if (debugLog)
                {
                    UnityEngine.Debug.LogWarning("One of the Face Object Groups is null and will be skipped.");
                }
            }

            if (meshTargetList.Count == 0)
            {
                UnityEngine.Debug.LogWarning("No valid meshes with blendshapes found in any of the Face Object Groups.");
            }
        }
        else
        {
            UnityEngine.Debug.LogError("No Face Object Groups assigned!");
        }
    }

    void InitializeBlendShapeCache()
    {
        blendShapeCache = new Dictionary<string, List<BlendShapeTarget>>();

        foreach (SkinnedMeshRenderer meshTarget in meshTargetList)
        {
            if (meshTarget == null || meshTarget.sharedMesh == null)
                continue;

            for (int i = 0; i < meshTarget.sharedMesh.blendShapeCount; i++)
            {
                string blendShapeName = meshTarget.sharedMesh.GetBlendShapeName(i);

                if (!IsARKitBlendShape(blendShapeName))
                    continue;

                if (!blendShapeCache.ContainsKey(blendShapeName))
                {
                    blendShapeCache[blendShapeName] = new List<BlendShapeTarget>();
                }

                blendShapeCache[blendShapeName].Add(new BlendShapeTarget(meshTarget, i));
            }
        }

        blendShapeCacheInitialized = true;

        if (debugLog)
        {
            Debug.Log($"BlendShape cache initialized with {blendShapeCache.Count} unique blend shapes");
        }
    }

    void InitializeBlendShapeValues()
    {
        if (currentBlendShapeValues == null)
            currentBlendShapeValues = new Dictionary<string, float>();
        if (targetBlendShapeValues == null)
            targetBlendShapeValues = new Dictionary<string, float>();

        currentBlendShapeValues.Clear();
        targetBlendShapeValues.Clear();

        if (blendShapeCacheInitialized)
        {
            foreach (var kvp in blendShapeCache)
            {
                string blendShapeName = kvp.Key;
                var targets = kvp.Value;

                if (targets.Count > 0 && targets[0].renderer != null)
                {
                    float currentWeight = targets[0].renderer.GetBlendShapeWeight(targets[0].blendShapeIndex);

                    if (!currentBlendShapeValues.ContainsKey(blendShapeName))
                    {
                        currentBlendShapeValues[blendShapeName] = currentWeight;
                        targetBlendShapeValues[blendShapeName] = currentWeight;
                    }
                }
            }
        }
        else
        {
            foreach (SkinnedMeshRenderer meshTarget in meshTargetList)
            {
                if (meshTarget != null && meshTarget.sharedMesh != null)
                {
                    for (int i = 0; i < meshTarget.sharedMesh.blendShapeCount; i++)
                    {
                        string blendShapeName = meshTarget.sharedMesh.GetBlendShapeName(i);
                        float currentWeight = meshTarget.GetBlendShapeWeight(i);

                        if (!currentBlendShapeValues.ContainsKey(blendShapeName))
                        {
                            currentBlendShapeValues[blendShapeName] = currentWeight;
                            targetBlendShapeValues[blendShapeName] = currentWeight;
                        }
                    }
                }
            }
        }

        if (debugLog)
        {
            Debug.Log($"Initialized {currentBlendShapeValues.Count} blendshape values for smoothing");
        }
    }

#if FINAL_IK
    void InitializeIK()
    {
        if (vrik == null)
        {
            UnityEngine.Debug.LogWarning("VRIK component not assigned!");
            return;
        }

        if (headTarget == null)
        {
            GameObject targetObj = new GameObject("HeadTarget");
            headTarget = targetObj.transform;

            headTarget.position = vrik.references.head.position;
            headTarget.rotation = vrik.references.head.rotation;

            headTarget.SetParent(vrik.references.head);
        }

        vrik.solver.spine.headTarget = headTarget;

        defaultHeadLocalPosition = headTarget.localPosition;
        defaultHeadLocalRotation = headTarget.localRotation;

        currentHeadPosition = defaultHeadLocalPosition;
        currentHeadRotation = defaultHeadLocalRotation;

        if (debugLog)
        {
            UnityEngine.Debug.Log($"Initialized IK with head target at local position: {defaultHeadLocalPosition}, rotation: {defaultHeadLocalRotation.eulerAngles}");
        }
    }
#endif

#if FACIAL_NO_NETWORK
    void InitializeUDP() { }
#else
    void InitializeUDP()
    {
        try
        {
            CleanUpUDP();

            System.Threading.Thread.Sleep(100);

            IPEndPoint endPoint = new IPEndPoint(IPAddress.Any, receivePort);

            receiver = new UdpClient();
            receiver.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
            receiver.Client.Bind(endPoint);

            isRunning = true;
            receiveThread = new Thread(new ThreadStart(ReceiveData));
            receiveThread.IsBackground = true;
            receiveThread.Start();

            lastReceivePort = receivePort;

            if (debugLog)
            {
                UnityEngine.Debug.Log($"UDP initialized on port {receivePort}");
            }
        }
        catch (SocketException se)
        {
            if (se.SocketErrorCode == SocketError.AddressAlreadyInUse)
            {
                UnityEngine.Debug.LogError($"Port {receivePort} is already in use. Please try a different port or close other applications using this port.");

                if (debugLog)
                {
                    UnityEngine.Debug.Log("Trying alternative ports...");
                }

                TryAlternativePorts();
            }
            else
            {
                UnityEngine.Debug.LogError($"Socket error initializing UDP: {se.Message} (Error Code: {se.SocketErrorCode})");
            }
        }
        catch (System.Exception e)
        {
            UnityEngine.Debug.LogError($"Failed to initialize UDP: {e.Message}");
        }
    }

    private void TryAlternativePorts()
    {
        int[] alternativePorts = { receivePort + 1, receivePort + 2, receivePort - 1, receivePort + 10, receivePort + 100 };

        foreach (int port in alternativePorts)
        {
            try
            {
                if (debugLog)
                {
                    UnityEngine.Debug.Log($"Trying port {port}...");
                }

                IPEndPoint endPoint = new IPEndPoint(IPAddress.Any, port);

                receiver = new UdpClient();
                receiver.Client.SetSocketOption(SocketOptionLevel.Socket, SocketOptionName.ReuseAddress, true);
                receiver.Client.Bind(endPoint);

                isRunning = true;
                receiveThread = new Thread(new ThreadStart(ReceiveData));
                receiveThread.IsBackground = true;
                receiveThread.Start();

                receivePort = port;
                lastReceivePort = receivePort;

                UnityEngine.Debug.LogWarning($"Using alternative port {port} instead of originally requested port.");

                if (debugLog)
                {
                    UnityEngine.Debug.Log($"Successfully initialized UDP on alternative port {port}");
                }

                return;
            }
            catch (System.Exception)
            {
                if (receiver != null)
                {
                    try
                    {
                        receiver.Close();
                        receiver = null;
                    }
                    catch { }
                }
                continue;
            }
        }

        UnityEngine.Debug.LogError("Failed to find an available port. Please manually set a different port number.");
    }

    void ReceiveData()
    {
        while (isRunning)
        {
            try
            {
                IPEndPoint remoteEP = null;
                byte[] data = receiver.Receive(ref remoteEP);
                currentMessage = Encoding.ASCII.GetString(data);

                if (debugLog)
                {
                    UnityEngine.Debug.Log($"Received data: {currentMessage}");
                }
            }
            catch (System.Exception e)
            {
                if (debugLog && isRunning)
                {
                    UnityEngine.Debug.LogError($"Error receiving data: {e.Message}");
                }
            }
        }
    }
#endif

    void Update()
    {
        if (Input.GetKeyDown(toggleUDPKey))
        {
            ToggleUDP();
        }

        if (Input.GetKeyDown(pauseKey))
        {
            ToggleTracking();
        }

        if (Input.GetKeyDown(resetKey))
        {
            ResetHeadToDefault();
        }

        if (!isTrackingPaused && !string.IsNullOrEmpty(currentMessage))
        {
            ProcessBlendshapeData(currentMessage);
        }

        UpdateTrackingWeight();

        // 신호 유실 시 모든 ARKit BlendShape 타겟을 0f로 설정
        if (enableSignalLossRecovery && isSignalLost)
        {
            SetAllTargetBlendShapesToZero();
        }

        if (!isTrackingPaused)
        {
            UpdateBlendShapeSmoothing();
        }
    }

    private void UpdateTrackingWeight()
    {
        if (!enableSignalLossRecovery)
        {
            trackingWeight = 1f;
            isSignalLost = false;
            return;
        }

        bool currentlyLost;
        if (!isUDPActive)
        {
            currentlyLost = true;
        }
        else if (lastSignalTime < 0f)
        {
            currentlyLost = true;
        }
        else
        {
            currentlyLost = (Time.time - lastSignalTime) > signalTimeoutThreshold;
        }

        if (isSignalLost != currentlyLost)
        {
            isSignalLost = currentlyLost;
            if (debugLog)
            {
                UnityEngine.Debug.Log(isSignalLost
                    ? $"[SignalLossRecovery] Signal lost. Fading to animator over {returnToAnimationDuration}s."
                    : $"[SignalLossRecovery] Signal recovered. Fading to tracking over {returnFromAnimationDuration}s.");
            }
        }

        float targetWeight = isSignalLost ? 0f : 1f;
        float duration = isSignalLost ? returnToAnimationDuration : returnFromAnimationDuration;

        if (duration <= 0f)
        {
            trackingWeight = targetWeight;
        }
        else
        {
            trackingWeight = Mathf.MoveTowards(trackingWeight, targetWeight, Time.deltaTime / duration);
        }
    }

    void UpdateBlendShapeSmoothing()
    {
        if (!enableBlendShapeSmoothing)
            return;

        // 신호가 유실된 AFK 상태라면 전용 복귀 속도(afkReturnSpeed)를 사용하고, 그렇지 않으면 일반 스무싱 속도를 사용
        float smoothingSpeed = (enableSignalLossRecovery && isSignalLost) ? afkReturnSpeed : GetBlendShapeSmoothingSpeed();

        // 50 이상일 경우 바로 값 대입 (스무딩 없음)
        bool isDirect = (smoothingSpeed >= 50f && !(enableSignalLossRecovery && isSignalLost));

        if (blendShapeCacheInitialized)
        {
            foreach (var kvp in blendShapeCache)
            {
                string blendShapeName = kvp.Key;

                if (targetBlendShapeValues.ContainsKey(blendShapeName) &&
                    currentBlendShapeValues.ContainsKey(blendShapeName))
                {
                    float targetValue = targetBlendShapeValues[blendShapeName];
                    float currentValue = currentBlendShapeValues[blendShapeName];

                    float newValue = isDirect ? targetValue : Mathf.Lerp(currentValue, targetValue, Time.deltaTime * smoothingSpeed);

                    currentBlendShapeValues[blendShapeName] = newValue;
                }
            }
        }
        else
        {
            foreach (SkinnedMeshRenderer meshTarget in meshTargetList)
            {
                if (meshTarget != null && meshTarget.sharedMesh != null)
                {
                    for (int i = 0; i < meshTarget.sharedMesh.blendShapeCount; i++)
                    {
                        string blendShapeName = meshTarget.sharedMesh.GetBlendShapeName(i);

                        if (targetBlendShapeValues.ContainsKey(blendShapeName) &&
                            currentBlendShapeValues.ContainsKey(blendShapeName))
                        {
                            float targetValue = targetBlendShapeValues[blendShapeName];
                            float currentValue = currentBlendShapeValues[blendShapeName];

                            float newValue = isDirect ? targetValue : Mathf.Lerp(currentValue, targetValue, Time.deltaTime * smoothingSpeed);

                            currentBlendShapeValues[blendShapeName] = newValue;
                        }
                    }
                }
            }
        }
    }

    private void SetAllTargetBlendShapesToZero()
    {
        if (cachedARKitBlendShapeNames == null) return;

        int count = cachedARKitBlendShapeNames.Count;
        for (int i = 0; i < count; i++)
        {
            string blendShapeName = cachedARKitBlendShapeNames[i];
            if (targetBlendShapeValues.ContainsKey(blendShapeName))
            {
                targetBlendShapeValues[blendShapeName] = 0f;
            }
        }
    }

    void ResetHeadToDefault()
    {
        switch (headTrackingMode)
        {
            case HeadTrackingMode.DirectRotation:
                if (headBone != null && headBoneInitialized)
                {
                    if (useLocalRotation)
                    {
                        headBone.localRotation = defaultHeadBoneRotation;
                        currentHeadRotation = defaultHeadBoneRotation;
                    }
                    else
                    {
                        headBone.rotation = defaultHeadBoneRotation;
                        currentHeadRotation = defaultHeadBoneRotation;
                    }

                    rotationOffset = receivedRotation;
                    offsetInitialized = true;

                    if (debugLog)
                    {
                        UnityEngine.Debug.Log($"Reset head bone to default rotation: {defaultHeadBoneRotation.eulerAngles}");
                    }
                }
                break;

#if FINAL_IK
            case HeadTrackingMode.VRIKWithTarget:
                if (headTarget != null)
                {
                    headTarget.localPosition = defaultHeadLocalPosition;
                    headTarget.localRotation = defaultHeadLocalRotation;

                    currentHeadPosition = defaultHeadLocalPosition;
                    currentHeadRotation = defaultHeadLocalRotation;

                    positionOffset = receivedPosition;
                    rotationOffset = receivedRotation;

                    offsetInitialized = true;

                    if (debugLog)
                    {
                        UnityEngine.Debug.Log($"Reset head to default position: {defaultHeadLocalPosition}, rotation: {defaultHeadLocalRotation.eulerAngles}");
                    }
                }
                break;
#endif
        }
    }

    void ProcessBlendshapeData(string message)
    {
        try
        {
            string[] sections = message.Split('=');
            if (sections.Length >= 2)
            {
                string[] blendShapes = sections[0].Split('|');
                foreach (string blendShape in blendShapes)
                {
                    string[] data = blendShape.Split(new char[] { '&', '-' }, System.StringSplitOptions.RemoveEmptyEntries);
                    if (data.Length == 2)
                    {
                        UpdateBlendShape(data[0], data[1]);
                    }
                }

                if (headTrackingMode != HeadTrackingMode.NoTracking)
                {
                    string[] headData = sections[1].Split('|');
                    foreach (string data in headData)
                    {
                        string[] parts = data.Split('#');
                        if (parts.Length == 2 && parts[0] == "head")
                        {
                            ProcessHeadTracking(parts[1]);
                        }
                    }
                }
            }
        }
        catch (System.Exception e)
        {
            if (debugLog)
            {
                UnityEngine.Debug.LogError($"Error processing data: {e.Message}");
            }
        }
    }

    void UpdateBlendShape(string shapeName, string weightStr)
    {
        try
        {
            if (!nameMappingCache.TryGetValue(shapeName, out string mappedShapeName))
            {
                mappedShapeName = shapeName.Replace("_R", "Right").Replace("_L", "Left");
                nameMappingCache[shapeName] = mappedShapeName;
            }

            float weight = float.Parse(weightStr, CultureInfo.InvariantCulture);

            if (blendShapeCacheInitialized && blendShapeCache.ContainsKey(mappedShapeName))
            {
                if (lastReceivedBlendShapeValues.TryGetValue(mappedShapeName, out float prevWeight))
                {
                    if (Mathf.Abs(weight - prevWeight) > blendShapeChangeThreshold)
                    {
                        lastSignalTime = Time.time;
                    }
                }
                else
                {
                    lastSignalTime = Time.time;
                }
                lastReceivedBlendShapeValues[mappedShapeName] = weight;
            }

            if (blendShapeCacheInitialized && blendShapeCache.TryGetValue(mappedShapeName, out var targets))
            {
                if (enableBlendShapeSmoothing)
                {
                    targetBlendShapeValues[mappedShapeName] = weight;
                }
                else
                {
                    targetBlendShapeValues[mappedShapeName] = weight;
                    currentBlendShapeValues[mappedShapeName] = weight;
                }

                if (debugLog)
                {
                    UnityEngine.Debug.Log($"Updated blendshape {mappedShapeName} to {weight} (smoothing: {enableBlendShapeSmoothing})");
                }
            }
        }
        catch (System.Exception e)
        {
            if (debugLog)
            {
                UnityEngine.Debug.LogError($"Error updating blendshape: {e.Message}");
            }
        }
    }

    void ProcessHeadTracking(string headData)
    {
        try
        {
            string[] values = headData.Split(',');

            if (values.Length >= 6)
            {
                float rotX = float.Parse(values[0], CultureInfo.InvariantCulture);
                float rotY = -float.Parse(values[1], CultureInfo.InvariantCulture);
                float rotZ = -float.Parse(values[2], CultureInfo.InvariantCulture);

                Quaternion newRotation = Quaternion.Euler(rotX, rotY, rotZ);

                if (IsValidQuaternion(newRotation))
                {
                    receivedRotation = newRotation;
                }
                else if (debugLog)
                {
                    UnityEngine.Debug.LogWarning($"Invalid rotation detected: {newRotation}, keeping previous value");
                }

#if FINAL_IK
                if (headTrackingMode == HeadTrackingMode.VRIKWithTarget)
                {
                    float posX = -float.Parse(values[3], CultureInfo.InvariantCulture) * positionScale;
                    float posY = float.Parse(values[4], CultureInfo.InvariantCulture) * positionScale;
                    float posZ = float.Parse(values[5], CultureInfo.InvariantCulture) * positionScale;

                    Vector3 newPosition = new Vector3(posX, posY, posZ);

                    if (IsValidVector3(newPosition))
                    {
                        receivedPosition = newPosition;
                    }
                    else if (debugLog)
                    {
                        UnityEngine.Debug.LogWarning($"Invalid position detected: {newPosition}, keeping previous value");
                    }
                }
#endif

                if (!offsetInitialized)
                {
                    rotationOffset = receivedRotation;

#if FINAL_IK
                    if (headTrackingMode == HeadTrackingMode.VRIKWithTarget)
                    {
                        positionOffset = receivedPosition;
                        targetPosition = defaultHeadLocalPosition;
                    }
#endif

                    targetRotation = (headTrackingMode == HeadTrackingMode.DirectRotation)
                        ? defaultHeadBoneRotation
#if FINAL_IK
                        : defaultHeadLocalRotation;
#else
                        : Quaternion.identity;
#endif

                    offsetInitialized = true;
                }
                else
                {
                    Quaternion calculatedRotation = Quaternion.Inverse(rotationOffset) * receivedRotation;
                    if (IsValidQuaternion(calculatedRotation))
                    {
                        targetRotation = calculatedRotation;
                    }

#if FINAL_IK
                    if (headTrackingMode == HeadTrackingMode.VRIKWithTarget)
                    {
                        Vector3 calculatedPosition = receivedPosition - positionOffset;
                        if (IsValidVector3(calculatedPosition))
                        {
                            targetPosition = calculatedPosition;
                        }
                    }
#endif
                }
            }
        }
        catch (System.Exception e)
        {
            if (debugLog)
            {
                UnityEngine.Debug.LogError($"Error processing head tracking: {e.Message}");
            }
        }
    }

    void LateUpdate()
    {
        if (isTrackingPaused)
            return;

        ApplyBlendShapesWithFade();

        switch (headTrackingMode)
        {
            case HeadTrackingMode.NoTracking:
                break;

            case HeadTrackingMode.DirectRotation:
                ApplyDirectRotation();
                break;

#if FINAL_IK
            case HeadTrackingMode.VRIKWithTarget:
                ApplyVRIKTracking();
                break;
#endif
        }
    }

    void ApplyBlendShapesWithFade()
    {
        if (trackingWeight <= 0.0001f)
            return;

        if (blendShapeCacheInitialized)
        {
            foreach (var kvp in blendShapeCache)
            {
                string blendShapeName = kvp.Key;
                if (!currentBlendShapeValues.TryGetValue(blendShapeName, out float trackedValue))
                    continue;

                float sensitivity = 1f;
                if (blendShapeSensitivityCache != null && blendShapeSensitivityCache.TryGetValue(blendShapeName, out float sens))
                {
                    sensitivity = sens;
                }
                float adjustedTrackedValue = trackedValue * sensitivity;

                foreach (var target in kvp.Value)
                {
                    if (target.renderer == null)
                        continue;

                    float finalValue;
                    if (trackingWeight >= 0.9999f)
                    {
                        finalValue = adjustedTrackedValue;
                    }
                    else
                    {
                        float animValue = target.renderer.GetBlendShapeWeight(target.blendShapeIndex);
                        finalValue = Mathf.Lerp(animValue, adjustedTrackedValue, trackingWeight);
                    }

                    target.renderer.SetBlendShapeWeight(target.blendShapeIndex, finalValue);
                }
            }
        }
        else
        {
            foreach (SkinnedMeshRenderer meshTarget in meshTargetList)
            {
                if (meshTarget == null || meshTarget.sharedMesh == null)
                    continue;

                for (int i = 0; i < meshTarget.sharedMesh.blendShapeCount; i++)
                {
                    string blendShapeName = meshTarget.sharedMesh.GetBlendShapeName(i);
                    if (!IsARKitBlendShape(blendShapeName))
                        continue;
                    if (!currentBlendShapeValues.TryGetValue(blendShapeName, out float trackedValue))
                        continue;

                    float sensitivity = 1f;
                    if (blendShapeSensitivityCache != null && blendShapeSensitivityCache.TryGetValue(blendShapeName, out float sens))
                    {
                        sensitivity = sens;
                    }
                    float adjustedTrackedValue = trackedValue * sensitivity;

                    float finalValue;
                    if (trackingWeight >= 0.9999f)
                    {
                        finalValue = adjustedTrackedValue;
                    }
                    else
                    {
                        float animValue = meshTarget.GetBlendShapeWeight(i);
                        finalValue = Mathf.Lerp(animValue, adjustedTrackedValue, trackingWeight);
                    }

                    meshTarget.SetBlendShapeWeight(i, finalValue);
                }
            }
        }
    }

    void ApplyDirectRotation()
    {
        if (headBone == null || !headBoneInitialized)
            return;

        Quaternion newRotation = Quaternion.Lerp(currentHeadRotation, targetRotation, Time.deltaTime * rotationSmoothing);

        if (IsValidQuaternion(newRotation))
        {
            currentHeadRotation = newRotation;
        }
        else if (debugLog)
        {
            UnityEngine.Debug.LogWarning("Invalid interpolated rotation detected, skipping rotation update");
        }

        if (trackingWeight <= 0.0001f)
            return;

        Quaternion finalRotation;
        if (trackingWeight >= 0.9999f)
        {
            finalRotation = currentHeadRotation;
        }
        else
        {
            Quaternion animRotation = useLocalRotation ? headBone.localRotation : headBone.rotation;
            finalRotation = Quaternion.Slerp(animRotation, currentHeadRotation, trackingWeight);
        }

        if (useLocalRotation)
        {
            headBone.localRotation = finalRotation;
        }
        else
        {
            headBone.rotation = finalRotation;
        }
    }

#if FINAL_IK
    void ApplyVRIKTracking()
    {
        if (headTarget == null || vrik == null)
            return;

        Vector3 newPosition = Vector3.Lerp(currentHeadPosition, targetPosition, Time.deltaTime * positionSmoothing);
        Quaternion newRotation = Quaternion.Lerp(currentHeadRotation, targetRotation, Time.deltaTime * rotationSmoothing);

        if (IsValidVector3(newPosition))
        {
            currentHeadPosition = newPosition;
        }
        else if (debugLog)
        {
            UnityEngine.Debug.LogWarning("Invalid interpolated position detected, skipping position update");
        }

        if (IsValidQuaternion(newRotation))
        {
            currentHeadRotation = newRotation;
        }
        else if (debugLog)
        {
            UnityEngine.Debug.LogWarning("Invalid interpolated rotation detected, skipping rotation update");
        }

        Vector3 finalPos;
        Quaternion finalRot;
        if (trackingWeight >= 0.9999f)
        {
            finalPos = currentHeadPosition;
            finalRot = currentHeadRotation;
        }
        else if (trackingWeight <= 0.0001f)
        {
            finalPos = defaultHeadLocalPosition;
            finalRot = defaultHeadLocalRotation;
        }
        else
        {
            finalPos = Vector3.Lerp(defaultHeadLocalPosition, currentHeadPosition, trackingWeight);
            finalRot = Quaternion.Slerp(defaultHeadLocalRotation, currentHeadRotation, trackingWeight);
        }

        headTarget.localPosition = finalPos;
        headTarget.localRotation = finalRot;
    }
#endif

    private bool HasBlendShapes(SkinnedMeshRenderer skin)
    {
        return skin != null && skin.sharedMesh != null && skin.sharedMesh.blendShapeCount > 0;
    }

    void OnDisable()
    {
        SaveSettings();
        CleanUpUDP();
    }

    void OnDestroy()
    {
        CleanUp();
    }

    void CleanUp()
    {
        CleanUpUDP();
    }

    private void InitializeSmoothingSlider()
    {
        if (blendShapeSmoothingSlider != null)
        {
            blendShapeSmoothingSlider.onValueChanged.AddListener((val) =>
            {
                SetBlendShapeSmoothing(val);
            });

            // Initialize smoothing value with current slider value
            SetBlendShapeSmoothing(blendShapeSmoothingSlider.value);
        }
    }

    private void InitializeSensitivitySliders()
    {
        if (sensitivitySettings == null) return;

        for (int i = 0; i < sensitivitySettings.Count; i++)
        {
            var setting = sensitivitySettings[i];
            if (setting == null) continue;

            if (setting.slider != null)
            {
                int index = i; // 클로저에서 사용할 인덱스 캡처

                setting.slider.onValueChanged.AddListener((val) =>
                {
                    setting.sensitivity = val;
                    UpdateSensitivityCache();

                    // 로드 완료 이후의 변경은 즉시 기록
                    if (settingsLoaded)
                    {
                        PlayerPrefs.SetFloat(SensitivityPrefKeyPrefix + index, val);
                    }
                });

                // Initialize sensitivity value with the current slider value
                setting.sensitivity = setting.slider.value;
            }
        }
    }

    private void UpdateSensitivityCache()
    {
        if (blendShapeSensitivityCache == null)
            blendShapeSensitivityCache = new Dictionary<string, float>();

        blendShapeSensitivityCache.Clear();

        if (sensitivitySettings == null) return;

        foreach (var setting in sensitivitySettings)
        {
            if (setting == null || setting.targetBlendShapes == null) continue;

            float sens = setting.sensitivity;
            foreach (var shapeName in setting.targetBlendShapes)
            {
                if (string.IsNullOrEmpty(shapeName)) continue;

                if (blendShapeSensitivityCache.TryGetValue(shapeName, out float existingSens))
                {
                    blendShapeSensitivityCache[shapeName] = existingSens * sens;
                }
                else
                {
                    blendShapeSensitivityCache[shapeName] = sens;
                }
            }
        }
    }

    public float GetSensitivity(string sliderName)
    {
        if (sensitivitySettings == null) return 1f;
        var setting = sensitivitySettings.Find(s => s.slider != null && s.slider.name == sliderName);
        return setting != null ? setting.sensitivity : 1f;
    }

    public void SetSensitivity(string sliderName, float value)
    {
        if (sensitivitySettings == null) return;
        var setting = sensitivitySettings.Find(s => s.slider != null && s.slider.name == sliderName);
        if (setting != null)
        {
            setting.sensitivity = Mathf.Clamp01(value);
            if (setting.slider != null)
            {
                setting.slider.value = setting.sensitivity;
            }
            UpdateSensitivityCache();
        }
    }

    public float GetSensitivity(int index)
    {
        if (sensitivitySettings == null || index < 0 || index >= sensitivitySettings.Count) return 1f;
        return sensitivitySettings[index].sensitivity;
    }

    public void SetSensitivity(int index, float value)
    {
        if (sensitivitySettings == null || index < 0 || index >= sensitivitySettings.Count) return;
        var setting = sensitivitySettings[index];
        setting.sensitivity = Mathf.Clamp01(value);
        if (setting.slider != null)
        {
            setting.slider.value = setting.sensitivity;
        }
        UpdateSensitivityCache();
    }

    private const string SmoothingPrefKey = "FacialMocap_BlendShapeSmoothing";
    private const string SensitivityPrefKeyPrefix = "FacialMocap_Sensitivity_";

    private void SaveSettings()
    {
        // 아직 저장값을 로드하지 않은 상태라면 저장하지 않음
        // (초기화 전 비활성화/파괴 시 기본값이 저장값을 덮어쓰는 것을 방지)
        if (!settingsLoaded)
        {
            if (debugLog)
            {
                UnityEngine.Debug.Log("SaveSettings skipped: settings not loaded yet.");
            }
            return;
        }

        PlayerPrefs.SetFloat(SmoothingPrefKey, blendShapeSmoothing);

        if (sensitivitySettings != null)
        {
            for (int i = 0; i < sensitivitySettings.Count; i++)
            {
                if (sensitivitySettings[i] != null)
                {
                    PlayerPrefs.SetFloat(SensitivityPrefKeyPrefix + i, sensitivitySettings[i].sensitivity);
                }
            }
        }

        PlayerPrefs.Save();
        if (debugLog)
        {
            UnityEngine.Debug.Log("Facial mocap settings saved to PlayerPrefs.");
        }
    }

    private void LoadSettings()
    {
        if (PlayerPrefs.HasKey(SmoothingPrefKey))
        {
            float savedSmoothing = PlayerPrefs.GetFloat(SmoothingPrefKey);
            SetBlendShapeSmoothing(savedSmoothing);
        }

        if (sensitivitySettings != null)
        {
            for (int i = 0; i < sensitivitySettings.Count; i++)
            {
                string key = SensitivityPrefKeyPrefix + i;
                if (sensitivitySettings[i] != null && PlayerPrefs.HasKey(key))
                {
                    float savedSens = PlayerPrefs.GetFloat(key);
                    sensitivitySettings[i].sensitivity = savedSens;
                    if (sensitivitySettings[i].slider != null)
                    {
                        sensitivitySettings[i].slider.value = savedSens;
                    }
                }
            }
            UpdateSensitivityCache();
        }

        // 이 시점부터 변경 즉시 저장 및 종료 시 저장 허용
        settingsLoaded = true;

        if (debugLog)
        {
            UnityEngine.Debug.Log("Facial mocap settings loaded from PlayerPrefs.");
        }
    }

    [System.Serializable]
    public class BlendShapeSensitivitySetting
    {
        [Tooltip("조절할 UI 슬라이더 컴포넌트")]
        public UnityEngine.UI.Slider slider;

        [Tooltip("민감도 기본값 (슬라이더가 없을 때 사용하거나 초기값, 0.0 = 0%, 1.0 = 100%)")]
        [Range(0f, 1f)]
        public float sensitivity = 1f;

        [Tooltip("조절할 블렌드쉐이프 이름 리스트")]
        public List<string> targetBlendShapes = new List<string>();
    }
}