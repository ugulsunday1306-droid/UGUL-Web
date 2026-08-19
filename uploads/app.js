// Gloomy Accordion Editor Core Script

// 1. Initial State Data Model
let state = {
  mainTitle: "Gloomy Guide",
  ariaLabel: "상세 안내 메뉴",
  titleFontFamily: "",
  titleFontUrl: "",
  colors: {
    bg: "#0c0d1a",
    bg2: "#17153a",
    purple: "#57419b",
    purple2: "#9f83df",
    purple3: "#cbb8ff",
    glow: "#b77cff",
    white: "#f4efff"
  },
  borderRadiusOpen: 34,
  items: [
    {
      buttonText: "작업 순서",
      contentTitle: "Process",
      bodyText: "작업 방향과 신청 내용에 따라 순서는 조금 달라질 수 있습니다.",
      steps: ["01. 파츠 서칭", "02. 성형", "03. 페이셜", "04. 파츠 적용", "05. 기능 추가", "06. 파일 전달"],
      noteText: "",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    },
    {
      buttonText: "신청 양식",
      contentTitle: "Order Form",
      bodyText: "사용 아바타 / 원하는 분위기 / 참고 이미지 / 필요한 기능 / 희망 작업 범위를 함께 전달해주세요.<br />설명이 구체적일수록 결과물이 더 정확하게 나옵니다.",
      steps: [],
      noteText: "",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    },
    {
      buttonText: "보유 아바타",
      contentTitle: "Avatar List",
      bodyText: "보유 중인 베이스 또는 작업 가능한 아바타 목록을 이 영역에 정리할 수 있습니다.<br />부스 구매 에셋은 기본적으로 양측 구매를 기준으로 작업합니다.",
      steps: [],
      noteText: "",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    },
    {
      buttonText: "딸내미 분양",
      contentTitle: "Original Model",
      bodyText: "미리 제작된 오리지널 모델 또는 커스텀 가능한 모델 정보를 넣는 영역입니다.<br />분양 가능 여부, 포함 파일, 사용 가능 환경 등을 정리하면 좋습니다.",
      steps: [],
      noteText: "",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    },
    {
      buttonText: "포트폴리오",
      contentTitle: "Portfolio",
      bodyText: "기존에 만든 가로 스크롤 갤러리 페이지를 별도 iframe으로 연결하거나,<br />이 페이지 안에 이미지/GIF 갤러리 섹션을 추가할 수 있습니다.",
      steps: [],
      noteText: "가로 갤러리는 JS를 사용하면 PC에서도 드래그 스크롤이 가능합니다.",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    },
    {
      buttonText: "자주 묻는 질문",
      contentTitle: "FAQ",
      bodyText: "작업 기간, 수정 가능 횟수, 파일 전달 방식, 추가 비용 발생 기준 등을 정리하는 영역입니다.",
      steps: [],
      noteText: "",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    },
    {
      buttonText: "주의사항",
      contentTitle: "Notice",
      bodyText: "작업 전 필요한 자료를 충분히 전달해주세요.<br />외부 에셋, 헤어, 의상, 악세사리 등은 저작권과 구매 여부 확인이 필요할 수 있습니다.",
      steps: [],
      noteText: "작업 전 상담을 통해 가능 여부를 먼저 확인합니다.",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    }
  ]
};

// Deep copy of the default state for Reset functionality
const DEFAULT_STATE = JSON.parse(JSON.stringify(state));

// Theme Presets Data
const PRESETS = {
  violet: {
    bg: "#0c0d1a",
    bg2: "#17153a",
    purple: "#57419b",
    purple2: "#9f83df",
    purple3: "#cbb8ff",
    glow: "#b77cff",
    white: "#f4efff"
  },
  cyber: {
    bg: "#05070f",
    bg2: "#0b1430",
    purple: "#0066cc",
    purple2: "#00bfff",
    purple3: "#80e5ff",
    glow: "#00f2fe",
    white: "#e6faff"
  },
  crimson: {
    bg: "#0d0505",
    bg2: "#260d0d",
    purple: "#9c1c1c",
    purple2: "#f25e5e",
    purple3: "#ffadad",
    glow: "#ff3c3c",
    white: "#ffebeb"
  },
  emerald: {
    bg: "#040a08",
    bg2: "#092419",
    purple: "#065f46",
    purple2: "#34d399",
    purple3: "#a7f3d0",
    glow: "#10b981",
    white: "#ecfdf5"
  }
};

// Monaco Editor Instance
let editorInstance = null;
let activeTab = "visual"; // "visual" or "code"
let previewDebounceTimer = null;

// File Management State
let projectFiles = {};
let activeFileName = "gloomy-accordion.html";
let dirHandle = null;
let fileHandles = {};
let isLocalDirectoryMode = false;

// History Stacks for Undo/Redo System
let undoStack = [];
let redoStack = [];
const MAX_HISTORY = 40;
let isApplyingHistory = false;
let hasPendingHistory = false;
let historyDebounceTimer = null;

// Monaco Editor CDN configuration
require.config({ paths: { vs: 'https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/0.39.0/min/vs' } });

// Main Initialization
window.addEventListener("DOMContentLoaded", () => {
  // Load files from storage or initialize defaults
  const filesLoaded = loadProjectFilesFromStorage();
  if (!filesLoaded) {
    const defaultContent = generateHTML(state);
    projectFiles = {
      "gloomy-accordion.html": defaultContent,
      "index.html": defaultContent
    };
    activeFileName = "gloomy-accordion.html";
    saveProjectFilesToStorage();
  } else {
    // Sync current active file back to state
    const currentActiveContent = projectFiles[activeFileName];
    const parsed = parseHTMLToState(currentActiveContent);
    if (parsed) {
      state = parsed;
    }
  }

  initUIElements();
  initThemeConfigInputs();
  initFileManagementUI();
  syncStateToUIElements();
  renderVisualForm();
  updatePreview();

  // Load Monaco Editor
  require(['vs/editor/editor.main'], () => {
    const codeContainer = document.getElementById("monaco-container");
    editorInstance = monaco.editor.create(codeContainer, {
      value: generateHTML(state),
      language: "html",
      theme: "vs-dark",
      automaticLayout: true,
      tabSize: 2,
      minimap: { enabled: false },
      fontSize: 13,
      scrollbar: {
        vertical: 'visible',
        horizontal: 'visible',
        useShadows: false,
        verticalHasArrows: false,
        horizontalHasArrows: false,
        verticalScrollbarSize: 8,
        horizontalScrollbarSize: 8
      }
    });

    // Code Change Event Listener
    editorInstance.onDidChangeModelContent(() => {
      if (activeTab === "code") {
        debouncedPreviewUpdate();

        // Real-time synchronization of direct code editor changes to projectFiles in memory and localStorage
        const currentCode = editorInstance.getValue();
        projectFiles[activeFileName] = currentCode;
        saveProjectFilesToStorage();

        // Try to keep the visual editor state synced in real-time as they type in the code editor
        const parsed = parseHTMLToState(currentCode);
        if (parsed) {
          state = parsed;
        }
      }
    });

    // Custom Keybinding command for Ctrl+S inside Monaco
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyCode.KeyS, () => {
      saveActiveFile();
    });

    // Custom Keybinding command for Ctrl+Shift+S inside Monaco
    editorInstance.addCommand(monaco.KeyMod.CtrlCmd | monaco.KeyMod.Shift | monaco.KeyCode.KeyS, () => {
      saveActiveFileAs();
    });
  });
});

// Initialize General UI Listeners
function initUIElements() {
  // Mode Tabs Switching
  const tabVisualBtn = document.getElementById("tab-visual");
  const tabCodeBtn = document.getElementById("tab-code");
  const visualContainer = document.getElementById("visual-form-container");
  const monacoContainer = document.getElementById("monaco-container");
  const editIndicator = document.getElementById("edit-indicator");

  tabVisualBtn.addEventListener("click", () => {
    if (activeTab === "visual") return;
    
    // Try to sync raw code editor HTML changes to visual form editor
    const currentCode = editorInstance.getValue();
    const parsedState = parseHTMLToState(currentCode);
    if (parsedState) {
      // Sync changes from code editor to history before loading into visual state
      pushToHistory();
      state = parsedState;
      syncStateToUIElements();
      renderVisualForm();
      showToast("💡 소스코드 변경사항이 비주얼 편집기에 반영되었습니다.");
    } else {
      showToast("⚠️ 코드가 손상되어 비주얼 편집기로 전환할 수 없습니다. 수동 코드 작성을 권장합니다.");
    }

    tabVisualBtn.classList.add("active");
    tabCodeBtn.classList.remove("active");
    visualContainer.classList.add("active");
    monacoContainer.classList.remove("active");
    editIndicator.innerText = "📝 폼을 채우면 실시간 반영됩니다.";
    activeTab = "visual";
  });

  tabCodeBtn.addEventListener("click", () => {
    if (activeTab === "code") return;
    
    // Sync current visual state to Monaco Editor
    const generatedCode = generateHTML(state);
    editorInstance.setValue(generatedCode);

    tabCodeBtn.classList.add("active");
    tabVisualBtn.classList.remove("active");
    monacoContainer.classList.add("active");
    visualContainer.classList.remove("active");
    editIndicator.innerText = "💻 소스코드를 직접 수정할 수 있습니다.";
    activeTab = "code";
  });

  // Action Buttons
  document.getElementById("btn-save").addEventListener("click", () => {
    saveActiveFile();
  });
  document.getElementById("btn-save-as").addEventListener("click", () => {
    saveActiveFileAs();
  });
  document.getElementById("btn-undo").addEventListener("click", undo);
  document.getElementById("btn-redo").addEventListener("click", redo);
  document.getElementById("btn-copy").addEventListener("click", copyCodeToClipboard);
  document.getElementById("btn-download").addEventListener("click", downloadHTMLFile);
  document.getElementById("btn-reset").addEventListener("click", resetEditorToDefault);
  document.getElementById("btn-refresh-preview").addEventListener("click", () => {
    updatePreview(true);
    showToast("🔄 프리뷰를 새로고침했습니다.");
  });

  // Add Item Button
  document.getElementById("btn-add-item").addEventListener("click", () => {
    pushToHistory(); // Push original state to history before adding a new item
    state.items.push({
      buttonText: "새로운 아코디언 메뉴",
      contentTitle: "Title",
      bodyText: "이곳에 상세 설명 및 본문 내용을 작성해 주세요.",
      steps: [],
      noteText: "",
      fontFamily: "",
      fontUrl: "",
      imageUrls: []
    });
    renderVisualForm();
    onVisualFormChange();
  });

  // Main Header Title inputs
  const mainTitleInput = document.getElementById("input-main-title");
  const subTitleInput = document.getElementById("input-sub-title");
  const titleFontFamilyInput = document.getElementById("input-title-font-family");
  const titleFontUrlInput = document.getElementById("input-title-font-url");

  mainTitleInput.addEventListener("input", (e) => {
    state.mainTitle = e.target.value;
    onVisualFormChange();
  });

  subTitleInput.addEventListener("input", (e) => {
    state.ariaLabel = e.target.value;
    onVisualFormChange();
  });

  titleFontFamilyInput.addEventListener("input", (e) => {
    const val = e.target.value;
    const parsed = tryParseFontFace(val);
    if (parsed) {
      pushToHistory(); // Push before block-pasted extraction
      state.titleFontFamily = parsed.fontFamily;
      state.titleFontUrl = parsed.fontUrl;
      
      // Update inputs physically in DOM
      document.getElementById("input-title-font-family").value = parsed.fontFamily;
      document.getElementById("input-title-font-url").value = parsed.fontUrl;
      
      showToast("💡 @font-face 코드에서 폰트명과 URL을 자동 추출했습니다!");
    } else {
      state.titleFontFamily = val;
    }
    onVisualFormChange();
  });

  titleFontUrlInput.addEventListener("input", (e) => {
    const val = e.target.value;
    const parsed = tryParseFontFace(val);
    if (parsed) {
      pushToHistory(); // Push before block-pasted extraction
      state.titleFontFamily = parsed.fontFamily;
      state.titleFontUrl = parsed.fontUrl;
      
      // Update inputs physically in DOM
      document.getElementById("input-title-font-family").value = parsed.fontFamily;
      document.getElementById("input-title-font-url").value = parsed.fontUrl;
      
      showToast("💡 @font-face 코드에서 폰트명과 URL을 자동 추출했습니다!");
    } else {
      state.titleFontUrl = val;
    }
    onVisualFormChange();
  });

  // Global Keyboard Shortcuts
  window.addEventListener("keydown", (e) => {
    const isCtrl = e.ctrlKey || e.metaKey;

    // Ctrl + Shift + S (Explicit Save As Shortcut)
    if (isCtrl && e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveActiveFileAs();
      return;
    }

    // Ctrl + S (Explicit Save Shortcut)
    if (isCtrl && !e.shiftKey && e.key.toLowerCase() === 's') {
      e.preventDefault();
      saveActiveFile();
      return;
    }

    if (activeTab !== "visual") return;
    
    // Do not trigger global undo if focus is inside Monaco code container
    if (document.activeElement && document.activeElement.closest("#monaco-container")) {
      return;
    }
    
    if (isCtrl) {
      if (e.key.toLowerCase() === 'z') {
        e.preventDefault();
        if (e.shiftKey) {
          redo();
        } else {
          undo();
        }
      } else if (e.key.toLowerCase() === 'y') {
        e.preventDefault();
        redo();
      }
    }
  });
}

// Sync UI Form inputs back to State variables when they change
function onVisualFormChange() {
  if (activeTab === "visual") {
    // Record pending history for consecutive input events (typing, dragging slider, etc.)
    recordPendingHistory();

    const html = generateHTML(state);
    debouncedPreviewUpdate();
    if (editorInstance) {
      editorInstance.setValue(html);
    }

    // Auto-save changes back to the Virtual Workspace files memory & LocalStorage in real-time
    projectFiles[activeFileName] = html;
    saveProjectFilesToStorage();
  }
}

// Sync current global state back to raw elements (e.g. after presets or reset)
function syncStateToUIElements() {
  document.getElementById("input-main-title").value = state.mainTitle;
  document.getElementById("input-sub-title").value = state.ariaLabel;
  document.getElementById("input-title-font-family").value = state.titleFontFamily || "";
  document.getElementById("input-title-font-url").value = state.titleFontUrl || "";
  
  // Update inputs
  document.getElementById("val-color-bg").value = state.colors.bg;
  document.getElementById("txt-color-bg").value = state.colors.bg.toUpperCase();
  document.getElementById("val-color-bg2").value = state.colors.bg2;
  document.getElementById("txt-color-bg2").value = state.colors.bg2.toUpperCase();
  document.getElementById("val-color-glow").value = state.colors.glow;
  document.getElementById("txt-color-glow").value = state.colors.glow.toUpperCase();
  document.getElementById("val-color-purple").value = state.colors.purple;
  document.getElementById("txt-color-purple").value = state.colors.purple.toUpperCase();
  
  document.getElementById("val-radius").value = state.borderRadiusOpen;
  document.getElementById("radius-val").innerText = state.borderRadiusOpen + "px";
}

// Initialize Theme Configuration Panel and Colors
function initThemeConfigInputs() {
  // Preset buttons Click handler
  const presetButtons = document.querySelectorAll(".theme-preset-btn");
  presetButtons.forEach(btn => {
    btn.addEventListener("click", () => {
      presetButtons.forEach(b => b.classList.remove("active"));
      btn.classList.add("active");

      const presetName = btn.dataset.preset;
      const themeColors = PRESETS[presetName];
      if (themeColors) {
        state.colors = { ...themeColors };
        // Sync color variables
        syncStateToUIElements();
        onVisualFormChange();
        showToast(`🎨 ${btn.innerText.trim()} 테마가 반영되었습니다!`);
      }
    });
  });

  // Dynamic Color pickers listeners
  const colorMappings = [
    { picker: "val-color-bg", text: "txt-color-bg", key: "bg" },
    { picker: "val-color-bg2", text: "txt-color-bg2", key: "bg2" },
    { picker: "val-color-glow", text: "txt-color-glow", key: "glow" },
    { picker: "val-color-purple", text: "txt-color-purple", key: "purple" }
  ];

  colorMappings.forEach(mapping => {
    const picker = document.getElementById(mapping.picker);
    const textInput = document.getElementById(mapping.text);

    picker.addEventListener("input", (e) => {
      const colorVal = e.target.value;
      textInput.value = colorVal.toUpperCase();
      state.colors[mapping.key] = colorVal;
      onVisualFormChange();
    });
  });

  // Border radius slider
  const radiusSlider = document.getElementById("val-radius");
  const radiusValueText = document.getElementById("radius-val");

  radiusSlider.addEventListener("input", (e) => {
    const radiusVal = e.target.value;
    radiusValueText.innerText = radiusVal + "px";
    state.borderRadiusOpen = parseInt(radiusVal, 10);
    onVisualFormChange();
  });
}

// Render Form panels for all accordion items in Visual editor
function renderVisualForm() {
  const container = document.getElementById("visual-accordion-items");
  container.innerHTML = "";

  state.items.forEach((item, index) => {
    const card = document.createElement("div");
    card.className = "form-card item-card";
    
    // Header for the Accordion Item edit card
    const cardHeader = document.createElement("div");
    cardHeader.className = "form-card-header";
    cardHeader.innerHTML = `
      <span class="form-card-title">📝 항목 ${index + 1} : ${item.buttonText}</span>
      <div class="form-card-actions">
        <button class="card-control-btn" title="위로 이동" onclick="moveAccordionItem(${index}, -1)">
          ▲
        </button>
        <button class="card-control-btn" title="아래로 이동" onclick="moveAccordionItem(${index}, 1)">
          ▼
        </button>
        <button class="card-control-btn delete" title="삭제" onclick="deleteAccordionItem(${index})">
          🗑️
        </button>
      </div>
    `;
    card.appendChild(cardHeader);

    // Row 1: Button Menu Text
    const row1 = document.createElement("div");
    row1.className = "form-row";
    row1.innerHTML = `
      <label>버튼 글자</label>
      <input type="text" class="form-input" value="${escapeHtml(item.buttonText)}" oninput="updateItemField(${index}, 'buttonText', this.value)">
    `;
    card.appendChild(row1);

    // Row 2: Content Title (Process, FAQ etc.)
    const row2 = document.createElement("div");
    row2.className = "form-row";
    row2.innerHTML = `
      <label>콘텐츠 소제목</label>
      <input type="text" class="form-input" value="${escapeHtml(item.contentTitle)}" oninput="updateItemField(${index}, 'contentTitle', this.value)">
    `;
    card.appendChild(row2);

    // Row 3: Steps (Optional array)
    const row3 = document.createElement("div");
    row3.className = "form-row vertical";
    
    const stepsHeader = document.createElement("div");
    stepsHeader.style = "display:flex; justify-content:space-between; width:100%; align-items:center; margin-bottom: 4px;";
    stepsHeader.innerHTML = `
      <label>진행 단계 프로세스 (선택사항)</label>
      <div style="display:flex; gap:6px;">
        <button class="btn" style="padding:2px 8px; font-size:11px;" onclick="addStepToItem(${index})">+ 단계 추가</button>
        ${item.steps.length > 0 ? `<button class="btn" style="padding:2px 8px; font-size:11px; border-color:rgba(239,68,68,0.3); color:#f87171;" onclick="clearStepsFromItem(${index})">모두 삭제</button>` : ""}
      </div>
    `;
    row3.appendChild(stepsHeader);

    if (item.steps.length > 0) {
      const stepsGrid = document.createElement("div");
      stepsGrid.className = "step-input-grid";
      item.steps.forEach((step, stepIndex) => {
        const stepField = document.createElement("div");
        stepField.className = "step-field";
        stepField.innerHTML = `
          <span>${String(stepIndex + 1).padStart(2, '0')}.</span>
          <input type="text" class="form-input" value="${escapeHtml(step.replace(/^\d+\.\s*/, ""))}" oninput="updateItemStep(${index}, ${stepIndex}, this.value)" style="padding-right: 20px;">
          <button style="position:absolute; right:6px; top:50%; transform:translateY(-50%); background:none; border:none; color:rgba(255,255,255,0.4); cursor:pointer; font-size:10px;" onclick="deleteItemStep(${index}, ${stepIndex})">×</button>
        `;
        stepsGrid.appendChild(stepField);
      });
      row3.appendChild(stepsGrid);
    }
    card.appendChild(row3);

    // Row 4: Detailed Body text
    const row4 = document.createElement("div");
    row4.className = "form-row vertical";
    row4.innerHTML = `
      <label>본문 텍스트 (HTML 지원)</label>
      <textarea class="form-textarea" oninput="updateItemField(${index}, 'bodyText', this.value)">${item.bodyText}</textarea>
    `;
    card.appendChild(row4);

    // Row 5: Notes/Notice (Optional)
    const row5 = document.createElement("div");
    row5.className = "form-row";
    row5.innerHTML = `
      <label>주의/노트 라벨</label>
      <input type="text" class="form-input" placeholder="비워두면 표시 안 함" value="${escapeHtml(item.noteText)}" oninput="updateItemField(${index}, 'noteText', this.value)">
    `;
    card.appendChild(row5);

    // 🖼️ Image Attachment separator header
    const imageHeader = document.createElement("div");
    imageHeader.style = "font-size:11px; color:var(--text-secondary); margin-top:8px; border-top:1px dashed rgba(183, 124, 255, 0.15); padding-top:10px; font-weight:bold; letter-spacing:0.02em;";
    imageHeader.innerText = "🖼️ 이미지 첨부 (그리드 자동 정렬)";
    card.appendChild(imageHeader);

    // Row 5b: Multi-Image list and upload controls
    const rowImg = document.createElement("div");
    rowImg.className = "form-row vertical";
    
    let imagesListHtml = "";
    const urls = item.imageUrls || [];
    if (urls.length > 0) {
      imagesListHtml = `<div style="display:flex; flex-direction:column; gap:6px; width:100%; margin-bottom:10px;">`;
      urls.forEach((url, imgIdx) => {
        imagesListHtml += `
          <div style="display:flex; align-items:center; gap:10px; background:rgba(255,255,255,0.02); border:1px solid rgba(183,124,255,0.1); padding:6px 10px; border-radius:8px;">
            <img src="${url}" style="width:40px; height:40px; object-fit:cover; border-radius:4px; border:1px solid rgba(255,255,255,0.1);" alt="썸네일" />
            <span style="flex:1; font-size:11px; color:var(--text-secondary); white-space:nowrap; overflow:hidden; text-overflow:ellipsis;">${url.startsWith("data:") ? "업로드된 파일" : url}</span>
            <button class="card-control-btn delete" style="width:20px; height:20px; font-size:10px;" onclick="removeAccordionImage(${index}, ${imgIdx})" title="제거">×</button>
          </div>
        `;
      });
      imagesListHtml += `</div>`;
    } else {
      imagesListHtml = `<span style="font-size:11px; color:rgba(255,255,255,0.3); margin-bottom:8px;">첨부된 이미지가 없습니다.</span>`;
    }

    rowImg.innerHTML = `
      ${imagesListHtml}
      <div style="display:grid; grid-template-columns: 1fr 120px; gap:8px; width:100%; margin-bottom:8px;">
        <input type="text" class="form-input url-input-${index}" placeholder="이미지 URL 주소 붙여넣기...">
        <button class="btn" style="padding:6px; font-size:11px;" onclick="addImageUrlToItem(${index})">+ URL 추가</button>
      </div>
      <div style="display:flex; flex-direction:column; gap:4px; width:100%;">
        <span style="font-size:10px; color:var(--text-secondary);">로컬 컴퓨터 파일 업로드</span>
        <input type="file" accept="image/*" class="form-input multi-file-img-${index}" style="padding: 4px 8px;">
      </div>
    `;
    card.appendChild(rowImg);

    // 🔤 Font customization separator header
    const fontHeader = document.createElement("div");
    fontHeader.style = "font-size:11px; color:var(--text-secondary); margin-top:8px; border-top:1px dashed rgba(183, 124, 255, 0.15); padding-top:10px; font-weight:bold; letter-spacing:0.02em;";
    fontHeader.innerText = "🔤 폰트 개별 지정 (선택사항)";
    card.appendChild(fontHeader);

    // Row 6: Custom Font Family name
    const row6 = document.createElement("div");
    row6.className = "form-row";
    row6.innerHTML = `
      <label>폰트 패밀리명</label>
      <input type="text" class="form-input" placeholder="예: Nanum Brush Script" value="${escapeHtml(item.fontFamily || '')}" oninput="updateItemField(${index}, 'fontFamily', this.value)">
    `;
    card.appendChild(row6);

    // Row 7: Custom Font import URL
    const row7 = document.createElement("div");
    row7.className = "form-row";
    row7.innerHTML = `
      <label>웹폰트 URL</label>
      <input type="text" class="form-input" placeholder="예: https://cdn.jsdelivr.net/... (woff2 또는 css 링크)" value="${escapeHtml(item.fontUrl || '')}" oninput="updateItemField(${index}, 'fontUrl', this.value)">
    `;
    card.appendChild(row7);

    container.appendChild(card);

    // File Input listener
    const fileInput = card.querySelector(`.multi-file-img-${index}`);
    if (fileInput) {
      fileInput.addEventListener("change", (e) => {
        const file = e.target.files[0];
        if (file) {
          const reader = new FileReader();
          reader.onload = (event) => {
            pushToHistory(); // Push history before adding local uploaded image
            if (!state.items[index].imageUrls) state.items[index].imageUrls = [];
            state.items[index].imageUrls.push(event.target.result);
            renderVisualForm();
            onVisualFormChange();
            showToast("🖼️ 이미지가 성공적으로 업로드되었습니다!");
          };
          reader.readAsDataURL(file);
        }
      });
    }
  });
}

// Global functions for Accordion Item lists manipulations (attached to onclick)
window.addImageUrlToItem = function(index) {
  const input = document.querySelector(`.url-input-${index}`);
  if (input && input.value.trim() !== "") {
    pushToHistory(); // Push history before adding image URL
    const url = input.value.trim();
    if (!state.items[index].imageUrls) state.items[index].imageUrls = [];
    state.items[index].imageUrls.push(url);
    renderVisualForm();
    onVisualFormChange();
    showToast("🔗 이미지 URL이 추가되었습니다!");
  } else {
    showToast("⚠️ 올바른 이미지 URL을 입력해 주세요.");
  }
};

window.removeAccordionImage = function(itemIndex, imgIndex) {
  if (state.items[itemIndex].imageUrls) {
    pushToHistory(); // Push history before removing image
    state.items[itemIndex].imageUrls.splice(imgIndex, 1);
    renderVisualForm();
    onVisualFormChange();
    showToast("🗑️ 이미지가 제거되었습니다.");
  }
};

window.updateItemField = function(itemIndex, fieldKey, val) {
  if (fieldKey === 'fontFamily' || fieldKey === 'fontUrl') {
    const parsed = tryParseFontFace(val);
    if (parsed) {
      pushToHistory(); // Push before block-pasted extraction
      state.items[itemIndex].fontFamily = parsed.fontFamily;
      state.items[itemIndex].fontUrl = parsed.fontUrl;
      renderVisualForm();
      onVisualFormChange();
      showToast("💡 @font-face 코드에서 폰트명과 URL을 자동 추출했습니다!");
      return;
    }
  }

  state.items[itemIndex][fieldKey] = val;
  onVisualFormChange();
  
  // Dynamically update card title
  if (fieldKey === 'buttonText') {
    const cardTitle = document.querySelectorAll(".item-card .form-card-title")[itemIndex];
    if (cardTitle) cardTitle.innerText = `📝 항목 ${itemIndex + 1} : ${val}`;
  }
};

window.updateItemStep = function(itemIndex, stepIndex, val) {
  const prefix = String(stepIndex + 1).padStart(2, '0') + ". ";
  state.items[itemIndex].steps[stepIndex] = prefix + val;
  onVisualFormChange();
};

window.addStepToItem = function(itemIndex) {
  pushToHistory(); // Push history before adding process step
  const nextNum = state.items[itemIndex].steps.length + 1;
  const prefix = String(nextNum).padStart(2, '0') + ". 단계 제목";
  state.items[itemIndex].steps.push(prefix);
  renderVisualForm();
  onVisualFormChange();
};

window.deleteItemStep = function(itemIndex, stepIndex) {
  pushToHistory(); // Push history before deleting process step
  state.items[itemIndex].steps.splice(stepIndex, 1);
  // Re-adjust prefixes
  state.items[itemIndex].steps = state.items[itemIndex].steps.map((st, i) => {
    const rawVal = st.replace(/^\d+\.\s*/, "");
    return String(i + 1).padStart(2, '0') + ". " + rawVal;
  });
  renderVisualForm();
  onVisualFormChange();
};

window.clearStepsFromItem = function(itemIndex) {
  pushToHistory(); // Push history before clearing all steps
  state.items[itemIndex].steps = [];
  renderVisualForm();
  onVisualFormChange();
};

window.deleteAccordionItem = function(index) {
  if (confirm("정말 이 아코디언 메뉴 항목을 삭제하시겠습니까?")) {
    pushToHistory(); // Push original state to history before deleting an item
    state.items.splice(index, 1);
    renderVisualForm();
    onVisualFormChange();
    showToast("🗑️ 아코디언 항목이 삭제되었습니다.");
  }
};

window.moveAccordionItem = function(index, dir) {
  const targetIndex = index + dir;
  if (targetIndex < 0 || targetIndex >= state.items.length) return;

  pushToHistory(); // Push original state to history before moving an item
  // Swap
  const temp = state.items[index];
  state.items[index] = state.items[targetIndex];
  state.items[targetIndex] = temp;

  renderVisualForm();
  onVisualFormChange();
};

// Update Preview iFrame content
function updatePreview(force = false) {
  const iframe = document.getElementById("preview-frame");
  const loader = document.getElementById("preview-loader");
  
  loader.classList.add("active");

  let htmlContent = "";
  if (activeTab === "code" && editorInstance && !force) {
    htmlContent = editorInstance.getValue();
  } else {
    htmlContent = generateHTML(state);
  }

  // Auto save to local file on physical disk if in directory mode
  autoSaveLocalFile();

  // Load the content safely inside the frame
  setTimeout(() => {
    iframe.srcdoc = htmlContent;
    iframe.onload = () => {
      loader.classList.remove("active");
    };
  }, 200);
}

// Debounced preview wrapper
function debouncedPreviewUpdate() {
  clearTimeout(previewDebounceTimer);
  previewDebounceTimer = setTimeout(() => {
    updatePreview();
  }, 300);
}

// Reset Editor to defaults
function resetEditorToDefault() {
  if (confirm("정말로 아코디언 내용을 초기값으로 되돌리시겠습니까?")) {
    pushToHistory(); // Push original state to history before reset
    state = JSON.parse(JSON.stringify(DEFAULT_STATE));
    syncStateToUIElements();
    renderVisualForm();
    
    // Remove custom active presets border-color highlights
    document.querySelectorAll(".theme-preset-btn").forEach(b => b.classList.remove("active"));
    document.querySelector(".theme-preset-btn[data-preset='violet']").classList.add("active");

    if (editorInstance) {
      editorInstance.setValue(generateHTML(state));
    }
    updatePreview(true);
    showToast("🔮 오리지널 아코디언 상태로 초기화되었습니다.");
  }
}

// Copy source code to Clipboard
function copyCodeToClipboard() {
  let code = "";
  if (editorInstance) {
    code = editorInstance.getValue();
  } else {
    code = generateHTML(state);
  }

  navigator.clipboard.writeText(code).then(() => {
    showToast("📋 클립보드에 HTML 소스코드가 복사되었습니다!");
  }).catch(() => {
    showToast("⚠️ 복사에 실패했습니다. 소스코드 탭에서 직접 복사해주세요.");
  });
}

// Download local index.html file
function downloadHTMLFile() {
  let code = "";
  if (editorInstance) {
    code = editorInstance.getValue();
  } else {
    code = generateHTML(state);
  }

  const blob = new Blob([code], { type: "text/html;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = activeFileName;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
  showToast(`💾 ${activeFileName} 파일 다운로드가 완료되었습니다!`);
}

// Show Toast feedback
function showToast(message) {
  const container = document.getElementById("toast-container");
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.innerText = message;
  container.appendChild(toast);

  // Remove toast automatically
  setTimeout(() => {
    toast.style.animation = "slideIn 0.3s cubic-bezier(0.16, 1, 0.3, 1) reverse forwards";
    toast.style.opacity = "0";
    setTimeout(() => {
      container.removeChild(toast);
    }, 300);
  }, 3000);
}

// Helper to escape HTML tags for input value previewing
function escapeHtml(text) {
  if (!text) return "";
  return text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

// Generator: HTML Document Builder from state
function generateHTML(data) {
  // Collect Custom fonts details to inject into stylesheet
  let customImports = "";
  let customFontFaces = "";
  let customFontRules = "";

  // 1. Process Main Header Custom Font if specified
  if (data.titleFontFamily && data.titleFontFamily.trim() !== "") {
    const headerFamilyName = data.titleFontFamily.trim();
    customFontRules += `
    /* Main Header Custom Font Override */
    .accordion-title h1 {
      font-family: "${escapeHtml(headerFamilyName)}", "SchoolSafetyRoundedSmile", sans-serif !important;
    }\n`;

    if (data.titleFontUrl && data.titleFontUrl.trim() !== "") {
      const url = data.titleFontUrl.trim();
      const isDirectFont = /\.(woff2|woff|ttf|otf|eot)(\?.*)?$/i.test(url);
      if (isDirectFont) {
        customFontFaces += `    @font-face {
      font-family: "${escapeHtml(headerFamilyName)}";
      src: url("${url}");
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }\n\n`;
      } else {
        customImports += `    @import url("${url}");\n`;
      }
    }
  }

  // 2. Process Individual Items Custom Fonts
  data.items.forEach((item, index) => {
    if (item.fontFamily && item.fontFamily.trim() !== "") {
      const familyName = item.fontFamily.trim();
      
      // Dynamic CSS font override rule for this item
      customFontRules += `
    /* Item ${index + 1} Custom Font Override */
    .item-font-${index},
    .item-font-${index} .accordion-button,
    .item-font-${index} .content,
    .item-font-${index} .content-title,
    .item-font-${index} .step {
      font-family: "${escapeHtml(familyName)}", "SchoolSafetyRoundedSmile", "Pretendard", sans-serif !important;
    }\n`;

      if (item.fontUrl && item.fontUrl.trim() !== "") {
        const url = item.fontUrl.trim();
        const isDirectFont = /\.(woff2|woff|ttf|otf|eot)(\?.*)?$/i.test(url);
        
        if (isDirectFont) {
          customFontFaces += `    @font-face {
      font-family: "${escapeHtml(familyName)}";
      src: url("${url}");
      font-weight: normal;
      font-style: normal;
      font-display: swap;
    }\n\n`;
        } else {
          // Standard webfont stylesheet CSS import
          customImports += `    @import url("${url}");\n`;
        }
      }
    }
  });

  // Render Accordion Item Tags
  let itemsHtml = "";
  data.items.forEach((item, index) => {
    let stepsHtml = "";
    if (item.steps && item.steps.length > 0) {
      let stepDivs = "";
      item.steps.forEach(st => {
        stepDivs += `            <div class="step">${escapeHtml(st)}</div>\n`;
      });
      stepsHtml = `          <div class="process" aria-label="작업 진행 단계">
${stepDivs}          </div>\n`;
    }

    let noteHtml = "";
    if (item.noteText && item.noteText.trim() !== "") {
      noteHtml = `\n          <br /><span class="note">${escapeHtml(item.noteText)}</span>`;
    }

    let imageGridHtml = "";
    const urls = item.imageUrls || [];
    if (urls.length > 0) {
      let imgTags = "";
      urls.forEach(url => {
        imgTags += `            <div class="content-image-wrap"><img src="${url}" class="content-image" alt="${escapeHtml(item.buttonText)} 이미지" /></div>\n`;
      });
      
      let colsClass = "auto";
      if (urls.length === 1) colsClass = "1";
      else if (urls.length === 2) colsClass = "2";
      else if (urls.length === 3) colsClass = "3";
      else if (urls.length === 4) colsClass = "4";

      imageGridHtml = `\n          <div class="content-image-grid cols-${colsClass}">\n${imgTags}          </div>`;
    }

    // Dynamic Font Class and Attributes for simple DOM parsing
    const fontClass = item.fontFamily && item.fontFamily.trim() !== "" ? ` item-font-${index}` : "";
    const fontAttrs = (item.fontFamily && item.fontFamily.trim() !== "" ? ` data-font-family="${escapeHtml(item.fontFamily.trim())}"` : "") + 
                      (item.fontUrl && item.fontUrl.trim() !== "" ? ` data-font-url="${escapeHtml(item.fontUrl.trim())}"` : "");

    itemsHtml += `    <section class="accordion-item${fontClass}"${fontAttrs}>
      <button class="accordion-button" type="button" aria-expanded="false">
        <span class="button-text">${escapeHtml(item.buttonText)}</span>
        <span class="arrow">▼</span>
      </button>
      <div class="panel">
        <div class="content">
          <div class="content-title">${escapeHtml(item.contentTitle)}</div><br />
${stepsHtml}          ${item.bodyText}${imageGridHtml}${noteHtml}
        </div>
      </div>
    </section>\n\n`;
  });

  return `<!DOCTYPE html>
<html lang="ko">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>Gloomy Virtual Accordion</title>
  <style>
${customImports ? customImports + '\n' : ''}    @font-face {
      font-family: "SchoolSafetyRoundedSmile";
      src: url("https://cdn.jsdelivr.net/gh/projectnoonnu/2408-5@1.0/HakgyoansimDunggeunmisoTTF-R.woff2") format("woff2");
      font-weight: normal;
      font-display: swap;
    }

${customFontFaces}    :root {
      --bg: ${data.colors.bg};
      --bg2: ${data.colors.bg2};
      --panel: #fbf9ff;
      --purple: ${data.colors.purple};
      --purple2: ${data.colors.purple2 || '#9f83df'};
      --purple3: ${data.colors.purple3 || '#cbb8ff'};
      --glow: ${data.colors.glow};
      --white: ${data.colors.white || '#f4efff'};
      --ease-soft: cubic-bezier(0.22, 1, 0.36, 1);
    }

    * {
      box-sizing: border-box;
    }

    html,
    body {
      margin: 0;
      padding: 0;
      width: 100%;
      overflow-x: hidden;
      background: var(--bg);
      font-family: "SchoolSafetyRoundedSmile", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif;
    }

    body {
      padding: 18px 10px 34px;
    }

    .accordion-wrap {
      width: min(100%, 1120px);
      margin: 0 auto;
    }

    .accordion-title {
      margin: 0 auto 18px;
      padding: 24px 18px 28px;
      text-align: center;
      border-radius: 22px;
      border: 2px solid rgba(215, 204, 255, 0.82);
      background:
        radial-gradient(circle at 14px 14px, rgba(190, 165, 255, 0.14) 2px, transparent 3px) 0 0 / 22px 22px,
        linear-gradient(135deg, rgba(69, 169, 201, 0.16) 0%, transparent 30%),
        linear-gradient(145deg, transparent 0%, transparent 48%, rgba(116, 89, 255, 0.24) 49%, rgba(127, 95, 255, 0.42) 78%, transparent 79%),
        linear-gradient(135deg, var(--bg) 0%, var(--bg2) 44%, var(--purple) 72%, var(--glow) 100%);
      box-shadow:
        0 0 0 4px rgba(159, 131, 223, 0.08),
        0 0 28px rgba(128, 95, 255, 0.35),
        inset 0 0 54px rgba(255, 255, 255, 0.04);
    }

    .accordion-title h1 {
      margin: 0;
      color: var(--white);
      font-size: clamp(30px, 5vw, 46px);
      line-height: 1.1;
      letter-spacing: 0.1em;
      text-shadow:
        0 2px 0 rgba(62, 42, 130, 0.85),
        0 0 18px rgba(210, 190, 255, 0.62),
        0 0 34px rgba(183, 124, 255, 0.36);
    }

    .title-line {
      width: min(68%, 620px);
      height: 2px;
      margin: 20px auto 0;
      background: linear-gradient(90deg, transparent, var(--glow), #ffffff, var(--purple2), transparent);
      box-shadow: 0 0 16px var(--glow);
    }

    .accordion-item {
      width: min(100%, 980px);
      margin: 16px auto;
      padding: 0;
      text-align: center;
      background: #ffffff;
      border: 2px solid var(--purple3);
      border-radius: 999px;
      color: #39296f;
      overflow: hidden;
      position: relative;
      box-shadow:
        0 4px 0 var(--purple),
        0 9px 0 rgba(48, 35, 115, 0.95),
        0 0 22px rgba(183, 124, 255, 0.38);
      transition:
        border-radius 0.72s var(--ease-soft),
        border-color 0.62s ease,
        box-shadow 0.62s ease,
        transform 0.35s ease;
      will-change: border-radius, box-shadow, transform;
    }

    .accordion-item::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 16px 16px, rgba(190,165,255,0.14) 2px, transparent 3px) 0 0 / 24px 24px,
        linear-gradient(135deg, var(--bg) 0%, var(--bg2) 42%, var(--purple) 72%, var(--glow) 100%);
      opacity: 0;
      transition: opacity 0.62s ease;
      pointer-events: none;
      z-index: 0;
    }

    .accordion-item:hover {
      transform: translateY(-1px);
      box-shadow:
        0 5px 0 var(--purple),
        0 10px 0 rgba(48, 35, 115, 0.95),
        0 0 30px rgba(183, 124, 255, 0.58);
    }

    .accordion-item.is-open {
      border-radius: ${data.borderRadiusOpen}px;
      border-color: #ded3ff;
      box-shadow:
        0 4px 0 var(--purple),
        0 9px 0 rgba(48, 35, 115, 0.95),
        0 0 34px rgba(183, 124, 255, 0.7);
    }

    .accordion-item.is-open::before {
      opacity: 1;
    }

    .accordion-button {
      appearance: none;
      -webkit-appearance: none;
      border: 0;
      cursor: pointer;
      outline: none;
      position: relative;
      display: block;
      width: 100%;
      margin: 0;
      padding: 17px 52px 16px;
      color: #39296f;
      font-family: "SchoolSafetyRoundedSmile", "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif;
      font-size: clamp(23px, 3.2vw, 32px);
      line-height: 1.12;
      font-weight: 900;
      letter-spacing: -0.03em;
      background: linear-gradient(180deg, #ffffff 0%, #f8f4ff 100%);
      overflow: hidden;
      transition:
        color 0.48s ease,
        text-shadow 0.48s ease;
      z-index: 1;
    }

    .accordion-button::before {
      content: "";
      position: absolute;
      inset: 0;
      background:
        radial-gradient(circle at 16px 16px, rgba(190,165,255,0.14) 2px, transparent 3px) 0 0 / 24px 24px,
        linear-gradient(135deg, var(--bg) 0%, var(--bg2) 42%, var(--purple) 72%, var(--glow) 100%);
      opacity: 0;
      transition: opacity 0.62s ease;
      pointer-events: none;
      z-index: 0;
    }

    .accordion-button::after {
      content: "";
      position: absolute;
      top: 0;
      left: -125%;
      width: 70%;
      height: 100%;
      background: linear-gradient(90deg, transparent, rgba(255,255,255,0.9), transparent);
      transform: skewX(-22deg);
      transition: left 0.95s var(--ease-soft);
      pointer-events: none;
      z-index: 1;
    }

    .button-text {
      position: relative;
      z-index: 2;
      display: inline-block;
    }

    .arrow {
      position: absolute;
      left: 50%;
      bottom: 3px;
      transform: translateX(-50%);
      color: var(--purple2);
      font-size: 12px;
      line-height: 1;
      transition: transform 0.52s var(--ease-soft), color 0.48s ease;
      z-index: 2;
    }

    .accordion-button:hover {
      color: var(--glow);
      text-shadow:
        0 0 8px rgba(183, 124, 255, 0.95),
        0 0 18px rgba(183, 124, 255, 0.55),
        0 0 30px rgba(183, 124, 255, 0.26);
    }

    .accordion-item.is-open .accordion-button {
      color: #f2ecff;
      text-shadow:
        0 0 10px rgba(220, 205, 255, 0.95),
        0 0 22px rgba(183, 124, 255, 0.62);
    }

    .accordion-item.is-open .accordion-button::before {
      opacity: 1;
    }

    .accordion-item.is-open .accordion-button::after {
      left: 145%;
    }

    .accordion-item.is-open .arrow {
      transform: translateX(-50%) rotate(180deg);
      color: #efe7ff;
    }

    .panel {
      max-height: 0;
      overflow: hidden;
      position: relative;
      z-index: 1;
      transition:
        max-height 0.72s var(--ease-soft),
        opacity 0.42s ease;
      opacity: 0;
    }

    .accordion-item.is-open .panel {
      opacity: 1;
    }

    .content {
      padding: 30px 30px 34px;
      color: #efeaff;
      font-family: "Pretendard", "Noto Sans KR", "Malgun Gothic", sans-serif;
      font-size: clamp(14px, 2.2vw, 17px);
      line-height: 1.85;
      background:
        radial-gradient(circle at 16px 16px, rgba(190,165,255,0.16) 2px, transparent 3px) 0 0 / 24px 24px,
        linear-gradient(135deg, rgba(68,170,200,0.12) 0%, transparent 28%),
        linear-gradient(145deg, transparent 0%, transparent 48%, rgba(116,89,255,0.22) 49%, rgba(127,95,255,0.34) 78%, transparent 79%),
        linear-gradient(180deg, var(--bg2) 0%, var(--bg) 100%);
      border-top: 1px solid rgba(215, 204, 255, 0.56);
      text-shadow: 0 0 8px rgba(150, 110, 255, 0.35);
      transform: translateY(-8px);
      filter: blur(2px);
      transition:
        transform 0.58s var(--ease-soft),
        filter 0.58s var(--ease-soft);
    }

    .accordion-item.is-open .content {
      transform: translateY(0);
      filter: blur(0);
    }

    .content-title {
      display: inline-block;
      margin-bottom: 14px;
      padding: 5px 18px 8px;
      color: #ffffff;
      font-family: "SchoolSafetyRoundedSmile", "Malgun Gothic", sans-serif;
      font-size: clamp(20px, 3vw, 27px);
      font-weight: bold;
      border-bottom: 2px solid var(--glow);
      text-shadow:
        0 0 10px rgba(183, 124, 255, 0.95),
        0 0 20px rgba(183, 124, 255, 0.55);
    }

    .note {
      display: inline-block;
      margin-top: 16px;
      padding: 10px 16px;
      color: #39296f;
      background: rgba(255,255,255,0.94);
      border-radius: 12px;
      border: 1px solid #d8c9ff;
      font-weight: 800;
      text-shadow: none;
      box-shadow: 0 0 18px rgba(183, 124, 255, 0.18);
    }

    .process {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      gap: 12px;
      max-width: 820px;
      margin: 8px auto 18px;
    }

    .step {
      padding: 14px 10px;
      border-radius: 14px;
      color: #39296f;
      background: rgba(255, 255, 255, 0.94);
      border: 1px solid #d8c9ff;
      font-weight: 900;
      text-shadow: none;
      box-shadow: 0 0 18px rgba(183, 124, 255, 0.15);
    }

    .content-image-grid {
      display: flex;
      flex-wrap: nowrap;
      gap: 14px;
      margin: 20px auto 10px;
      width: 100%;
      max-width: 100%;
      justify-content: flex-start;
      overflow-x: auto;
      overflow-y: hidden;
      padding: 8px 4px 14px;
      cursor: grab;
      user-select: none;
      overscroll-behavior-x: contain;
      scrollbar-width: none;
      -ms-overflow-style: none;
      touch-action: pan-x;
    }

    .content-image-grid::-webkit-scrollbar {
      display: none;
    }

    .content-image-grid.is-dragging {
      cursor: grabbing;
      scroll-snap-type: none;
    }

    .content-image-grid.cols-1,
    .content-image-grid.cols-2,
    .content-image-grid.cols-3,
    .content-image-grid.cols-4,
    .content-image-grid.cols-auto {
      max-width: 100%;
    }

    .content-image-wrap {
      flex: 0 0 clamp(210px, 34vw, 300px);
      aspect-ratio: 1 / 1;
      border-radius: 12px;
      border: 1px solid rgba(215, 204, 255, 0.3);
      overflow: hidden;
      box-shadow: 
        0 6px 18px rgba(0, 0, 0, 0.25),
        0 0 10px rgba(183, 124, 255, 0.1);
      transition: transform 0.4s var(--ease-soft), box-shadow 0.4s ease;
      cursor: grab;
      /* GPU Hardware Compositing layer acceleration */
      will-change: transform;
      transform: translateZ(0);
      backface-visibility: hidden;
      perspective: 1000px;
    }

    .content-image-grid.is-dragging .content-image-wrap {
      cursor: grabbing;
    }

    .content-image-wrap:hover {
      transform: translateY(-2px) scale(1.02) translateZ(0);
      box-shadow: 
        0 10px 24px rgba(0, 0, 0, 0.35),
        0 0 18px rgba(183, 124, 255, 0.25);
    }

    .content-image {
      display: block;
      width: 100%;
      height: 100%;
      max-height: none;
      object-fit: cover;
      pointer-events: none;
      -webkit-user-drag: none;
      /* Optimize image decoding bottlenecks */
      will-change: transform;
      backface-visibility: hidden;
      image-rendering: -webkit-optimize-contrast;
    }

    @media (max-width: 640px) {
      body {
        padding: 12px 8px 28px;
      }

      .accordion-title {
        padding: 20px 14px 24px;
      }

      .accordion-item {
        margin: 13px auto;
      }

      .accordion-button {
        padding-left: 42px;
        padding-right: 42px;
      }

      .content {
        padding: 24px 18px 28px;
      }

      .process {
        grid-template-columns: 1fr;
      }
    }

${customFontRules}  </style>
</head>
<body>
  <main class="accordion-wrap">
    <section class="accordion-title" aria-label="${data.ariaLabel}"${data.titleFontFamily ? ' data-font-family="' + escapeHtml(data.titleFontFamily.trim()) + '"' : ''}${data.titleFontUrl ? ' data-font-url="' + escapeHtml(data.titleFontUrl.trim()) + '"' : ''}>
      <h1>${escapeHtml(data.mainTitle)}</h1>
      <div class="title-line"></div>
    </section>

${itemsHtml}  </main>

  <script>
    const items = document.querySelectorAll(".accordion-item");

    function closeItem(item) {
      const button = item.querySelector(".accordion-button");
      const panel = item.querySelector(".panel");

      item.classList.remove("is-open");
      button.setAttribute("aria-expanded", "false");
      panel.style.maxHeight = "0px";
    }

    function openItem(item) {
      const button = item.querySelector(".accordion-button");
      const panel = item.querySelector(".panel");

      item.classList.add("is-open");
      button.setAttribute("aria-expanded", "true");
      panel.style.maxHeight = panel.scrollHeight + "px";
    }

    items.forEach((item) => {
      const button = item.querySelector(".accordion-button");

      button.addEventListener("click", () => {
        const isOpen = item.classList.contains("is-open");

        items.forEach((otherItem) => {
          if (otherItem !== item) closeItem(otherItem);
        });

        if (isOpen) {
          closeItem(item);
        } else {
          openItem(item);
        }
      });
    });

    function refreshOpenPanels() {
      document.querySelectorAll(".accordion-item.is-open .panel").forEach((panel) => {
        panel.style.maxHeight = panel.scrollHeight + "px";
      });
    }

    function enableDragScroll(slider) {
      let isDragging = false;
      let isCooldowned = false;
      let isHovered = false;
      
      let startX = 0;
      let scrollLeft = 0;
      let moved = false;
      
      // Dynamic DOM Cloning Setup to establish a seamless infinite loop track
      const children = Array.from(slider.children);
      if (children.length === 0) return;
      
      // Deep clone all image children and append them to double the scroll track
      children.forEach(child => {
        const clone = child.cloneNode(true);
        slider.appendChild(clone);
      });
      
      // Measure and update the exact un-cloned scrollable width dynamically
      let originalScrollWidth = slider.scrollWidth / 2;
      
      function updateOriginalWidth() {
        const firstChild = slider.children[0];
        const firstClone = slider.children[children.length];
        if (firstChild && firstClone) {
          originalScrollWidth = firstClone.offsetLeft - firstChild.offsetLeft;
        } else {
          originalScrollWidth = slider.scrollWidth / 2;
        }
      }
      
      // Initial dynamic measurement
      updateOriginalWidth();
      
      // Floating-point accumulator to prevent browser integer truncating freezes
      let scrollAccumulator = slider.scrollLeft;
      
      // Recalculate width on individual image load triggers to prevent early measurement errors
      slider.querySelectorAll(".content-image").forEach(img => {
        img.addEventListener("load", () => {
          updateOriginalWidth();
          scrollAccumulator = slider.scrollLeft;
        });
      });
      
      // Recalculate on browser window resizing
      window.addEventListener("resize", () => {
        updateOriginalWidth();
        scrollAccumulator = slider.scrollLeft;
      });
      
      let autoplayTimer = null;
      let animationId = null;

      // Core animation loop
      function step() {
        if (!isDragging && !isCooldowned && !isHovered) {
          // If we reach the end of the original set, silently wrap back to 0 (fraction-aware)
          if (scrollAccumulator >= originalScrollWidth) {
            scrollAccumulator -= originalScrollWidth;
            slider.scrollLeft = Math.floor(scrollAccumulator);
          } else {
            // Elegant cinematic crawl speed (0.2px per frame - reduced by half)
            scrollAccumulator += 0.2; 
            slider.scrollLeft = Math.floor(scrollAccumulator);
          }
        }
        animationId = requestAnimationFrame(step);
      }

      // Start the autoplay loop
      animationId = requestAnimationFrame(step);

      // Mouse drag controls
      slider.addEventListener("mousedown", (event) => {
        updateOriginalWidth();
        isDragging = true;
        isCooldowned = true; // Instantly halt autoplay transitions
        moved = false;
        slider.classList.add("is-dragging");
        startX = event.pageX;
        scrollLeft = slider.scrollLeft;
        
        // Sync accumulator to current physical position
        scrollAccumulator = slider.scrollLeft;
        
        // Temporarily clear autoplay recovery timers during active drag
        clearTimeout(autoplayTimer);
      });

      window.addEventListener("mousemove", (event) => {
        if (!isDragging) return;

        event.preventDefault();
        const walk = event.pageX - startX;

        if (Math.abs(walk) > 4) moved = true;
        
        // Compute circular target scroll and adjust drag origin dynamic offsets
        let targetScroll = scrollLeft - walk;
        if (targetScroll >= originalScrollWidth) {
          targetScroll -= originalScrollWidth;
          scrollLeft -= originalScrollWidth;
        } else if (targetScroll < 0) {
          targetScroll += originalScrollWidth;
          scrollLeft += originalScrollWidth;
        }
        
        slider.scrollLeft = targetScroll;
        scrollAccumulator = slider.scrollLeft;
      });

      const handleMouseUp = () => {
        if (!isDragging) return;

        isDragging = false;
        slider.classList.remove("is-dragging");
        
        // Sync accumulator once more
        scrollAccumulator = slider.scrollLeft;
        
        // Wait 1.2 seconds cooldown period after drag release before resuming autoplay
        clearTimeout(autoplayTimer);
        isCooldowned = true;
        autoplayTimer = setTimeout(() => {
          isCooldowned = false;
        }, 1200);
      };

      window.addEventListener("mouseup", handleMouseUp);

      // Pause autoplay on mouse hover (only pause if we are not actively dragging)
      slider.addEventListener("mouseenter", () => {
        updateOriginalWidth();
        if (!isDragging) {
          isHovered = true;
        }
      });

      slider.addEventListener("mouseleave", () => {
        isHovered = false;
      });

      slider.addEventListener("click", (event) => {
        if (!moved) return;

        event.preventDefault();
        event.stopPropagation();
      }, true);
    }

    document.querySelectorAll(".content-image-grid").forEach((slider) => {
      enableDragScroll(slider);
    });

    document.querySelectorAll(".content-image").forEach((image) => {
      image.addEventListener("load", refreshOpenPanels);
    });

    window.addEventListener("resize", refreshOpenPanels);
  </script>
</body>
</html>`;
}

// Parser: Reverse parsing of standard template HTML string back to state JSON object.
// Allows fully functional round-trip editing (Code Editor changes -> Visual forms).
function parseHTMLToState(html) {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(html, "text/html");

    const newParsedState = {
      mainTitle: "Gloomy Guide",
      ariaLabel: "상세 안내 메뉴",
      colors: {
        bg: "#0c0d1a",
        bg2: "#17153a",
        purple: "#57419b",
        purple2: "#9f83df",
        purple3: "#cbb8ff",
        glow: "#b77cff",
        white: "#f4efff"
      },
      borderRadiusOpen: 34,
      items: []
    };

    // 1. Get Main Title & Subtitle label
    const titleEl = doc.querySelector(".accordion-title h1");
    if (titleEl) newParsedState.mainTitle = titleEl.innerText.trim();

    const titleSecEl = doc.querySelector(".accordion-title");
    if (titleSecEl) {
      if (titleSecEl.getAttribute("aria-label")) {
        newParsedState.ariaLabel = titleSecEl.getAttribute("aria-label");
      }
      newParsedState.titleFontFamily = titleSecEl.getAttribute("data-font-family") || "";
      newParsedState.titleFontUrl = titleSecEl.getAttribute("data-font-url") || "";
    }

    // 2. Parse Custom CSS Variables from style tag
    const styleEl = doc.querySelector("style");
    if (styleEl) {
      const cssText = styleEl.innerHTML;
      
      const parseVariable = (varName, defaultVal) => {
        const regex = new RegExp(`${varName}:\\s*([^;\\n]+);`);
        const match = cssText.match(regex);
        return match ? match[1].trim() : defaultVal;
      };

      newParsedState.colors.bg = parseVariable("--bg", "#0c0d1a");
      newParsedState.colors.bg2 = parseVariable("--bg2", "#17153a");
      newParsedState.colors.purple = parseVariable("--purple", "#57419b");
      newParsedState.colors.purple2 = parseVariable("--purple2", "#9f83df");
      newParsedState.colors.purple3 = parseVariable("--purple3", "#cbb8ff");
      newParsedState.colors.glow = parseVariable("--glow", "#b77cff");
      newParsedState.colors.white = parseVariable("--white", "#f4efff");

      // Parse active border radius
      const radiusMatch = cssText.match(/\.accordion-item\.is-open\s*\{[^}]*border-radius:\s*(\d+)px/);
      if (radiusMatch) {
        newParsedState.borderRadiusOpen = parseInt(radiusMatch[1], 10);
      }
    }

    // 3. Parse Accordion items
    const itemElements = doc.querySelectorAll(".accordion-item");
    if (itemElements && itemElements.length > 0) {
      itemElements.forEach(itemEl => {
        const buttonTextEl = itemEl.querySelector(".accordion-button .button-text");
        const buttonText = buttonTextEl ? buttonTextEl.innerText.trim() : "메뉴";

        const contentTitleEl = itemEl.querySelector(".content .content-title");
        const contentTitle = contentTitleEl ? contentTitleEl.innerText.trim() : "소제목";

        // Read note text
        const noteEl = itemEl.querySelector(".content .note");
        const noteText = noteEl ? noteEl.innerText.trim() : "";

        // Read steps
        const steps = [];
        const stepEls = itemEl.querySelectorAll(".content .process .step");
        if (stepEls && stepEls.length > 0) {
          stepEls.forEach(stepEl => {
            steps.push(stepEl.innerText.trim());
          });
        }

        // Extract custom font and image properties
        const fontFamily = itemEl.getAttribute("data-font-family") || "";
        const fontUrl = itemEl.getAttribute("data-font-url") || "";
        
        // Extract dynamic image URLs directly from the DOM!
        const imgEls = itemEl.querySelectorAll(".content-image");
        const imageUrls = [];
        if (imgEls && imgEls.length > 0) {
          imgEls.forEach(img => {
        imageUrls.push(img.getAttribute("src") || "");
          });
        }

        // Extract body text: Clone content element, strip out title, steps, image and notes
        const contentClone = itemEl.querySelector(".content").cloneNode(true);
        const childTitle = contentClone.querySelector(".content-title");
        if (childTitle) contentClone.removeChild(childTitle);
        
        const childBrs = contentClone.querySelectorAll("br");
        childBrs.forEach(br => contentClone.removeChild(br));

        const childProcess = contentClone.querySelector(".process");
        if (childProcess) contentClone.removeChild(childProcess);

        const childImage = contentClone.querySelector(".content-image-grid");
        if (childImage) contentClone.removeChild(childImage);

        const childNote = contentClone.querySelector(".note");
        if (childNote) contentClone.removeChild(childNote);

        let bodyText = contentClone.innerHTML.trim();
        // Remove trailing or leading blank space
        bodyText = bodyText.replace(/^\s+|\s+$/g, "");

        newParsedState.items.push({
          buttonText,
          contentTitle,
          bodyText,
          steps,
          noteText,
          fontFamily,
          fontUrl,
          imageUrls
        });
      });
    } else {
      // If no accordion items found, return null to block syncing
      return null;
    }

    return newParsedState;
  } catch (err) {
    console.error("HTML parsing error: ", err);
    return null;
  }
}

// Helper to parse pasted @font-face code block dynamically
function tryParseFontFace(text) {
  if (!text) return null;
  
  const trimmed = text.trim();
  // Check if it looks like a @font-face CSS block
  if (!trimmed.includes("@font-face") && !trimmed.includes("font-family")) {
    return null;
  }
  
  // Extract font-family name (supports single/double quotes, spaces)
  const familyMatch = trimmed.match(/font-family\s*:\s*['"]?([^'";\n\r]+)['"]?/i);
  // Extract source url from url(...)
  const urlMatch = trimmed.match(/url\s*\(\s*['"]?([^'")]+)['"]?\s*\)/i);
  
  if (familyMatch && urlMatch) {
    return {
      fontFamily: familyMatch[1].trim(),
      fontUrl: urlMatch[1].trim()
    };
  }
  
  return null;
}

// ==========================================
// 📁 File Explorer & Project Manager Module (Local Directory Picker Support)
// ==========================================

function saveProjectFilesToStorage() {
  localStorage.setItem("gloomy_builder_files", JSON.stringify(projectFiles));
  localStorage.setItem("gloomy_builder_active_file", activeFileName);
  localStorage.setItem("gloomy_builder_dir_mode", isLocalDirectoryMode ? "true" : "false");
}

function loadProjectFilesFromStorage() {
  const storedFiles = localStorage.getItem("gloomy_builder_files");
  const storedActive = localStorage.getItem("gloomy_builder_active_file");
  const storedMode = localStorage.getItem("gloomy_builder_dir_mode");
  
  if (storedMode === "true") {
    isLocalDirectoryMode = false;
  }
  
  if (storedFiles && storedActive) {
    try {
      projectFiles = JSON.parse(storedFiles);
      activeFileName = storedActive;
      return true;
    } catch (e) {
      console.error("Error reading stored files: ", e);
    }
  }
  return false;
}

function renderFileDropdown() {
  const select = document.getElementById("select-active-file");
  if (!select) return;
  select.innerHTML = "";
  
  const filesList = isLocalDirectoryMode ? Object.keys(fileHandles) : Object.keys(projectFiles);
  
  if (filesList.length === 0) {
    const option = document.createElement("option");
    option.value = "";
    option.innerText = "(파일 없음)";
    select.appendChild(option);
    return;
  }

  filesList.forEach(fileName => {
    const option = document.createElement("option");
    option.value = fileName;
    option.innerText = (isLocalDirectoryMode ? "📂 " : "📄 ") + fileName;
    option.selected = (fileName === activeFileName);
    option.style.backgroundColor = "#110e28";
    option.style.color = "#f4efff";
    select.appendChild(option);
  });
}

function initFileManagementUI() {
  renderFileDropdown();

  const fileSelect = document.getElementById("select-active-file");
  const importBtn = document.getElementById("btn-file-import");
  const createBtn = document.getElementById("btn-file-create");
  const hiddenInput = document.getElementById("hidden-file-input");
  const folderOpenBtn = document.getElementById("btn-folder-open");

  // Open Local Folder (showDirectoryPicker)
  if (folderOpenBtn) {
    folderOpenBtn.addEventListener("click", async () => {
      try {
        dirHandle = await window.showDirectoryPicker({
          mode: 'readwrite'
        });
        
        fileHandles = {};
        isLocalDirectoryMode = true;
        
        // Scan for .html files
        for await (const entry of dirHandle.values()) {
          if (entry.kind === 'file' && entry.name.endsWith('.html')) {
            fileHandles[entry.name] = entry;
          }
        }
        
        const fileNames = Object.keys(fileHandles);
        if (fileNames.length === 0) {
          showToast("⚠️ 폴더에 .html 파일이 하나도 없습니다! 새 파일을 생성하세요.");
          activeFileName = "";
        } else {
          // Find standard index.html or first file
          const preferredFile = fileNames.find(n => n === "index.html" || n === "gloomy-accordion.html") || fileNames[0];
          activeFileName = preferredFile;
          
          // Read content
          const file = await fileHandles[activeFileName].getFile();
          const content = await file.text();
          loadCurrentFileIntoEditor(content);
        }
        
        saveProjectFilesToStorage();
        renderFileDropdown();
        showToast("📂 로컬 폴더가 성공적으로 열렸습니다! 편집 내용이 파일에 실시간 자동 저장됩니다.");
      } catch (err) {
        console.error("Directory pick canceled or failed: ", err);
        showToast("⚠️ 폴더 열기에 실패했거나 취소되었습니다.");
      }
    });
  }

  // Dropdown File Selection Change
  fileSelect.addEventListener("change", (e) => {
    switchActiveFile(e.target.value);
  });

  // Import File Handler
  importBtn.addEventListener("click", () => {
    hiddenInput.click();
  });

  hiddenInput.addEventListener("change", (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = async (event) => {
        const fileContent = event.target.result;
        if (!fileContent.includes("accordion-wrap") && !fileContent.includes("accordion-item")) {
          showToast("⚠️ 올바른 아코디언 가이드 HTML 파일이 아닙니다!");
          return;
        }

        if (isLocalDirectoryMode && dirHandle) {
          try {
            const newFileHandle = await dirHandle.getFileHandle(file.name, { create: true });
            const writable = await newFileHandle.createWritable();
            await writable.write(fileContent);
            await writable.close();
            
            fileHandles[file.name] = newFileHandle;
            activeFileName = file.name;
          } catch (err) {
            console.error("Import to local folder failed: ", err);
          }
        } else {
          projectFiles[file.name] = fileContent;
          activeFileName = file.name;
        }
        
        saveProjectFilesToStorage();
        renderFileDropdown();
        
        loadCurrentFileIntoEditor(fileContent);
        showToast(`📂 ${file.name} 파일을 성공적으로 가져왔습니다!`);
        hiddenInput.value = ""; // Reset
      };
      reader.readAsText(file);
    }
  });

  // Create New File Handler
  createBtn.addEventListener("click", async () => {
    let name = prompt("새로운 파일 이름을 입력해 주세요 (예: guide-faq.html):");
    if (!name || name.trim() === "") return;
    
    name = name.trim();
    if (!name.endsWith(".html")) {
      name += ".html";
    }

    const defaultTemplate = generateHTML(DEFAULT_STATE);

    if (isLocalDirectoryMode && dirHandle) {
      if (fileHandles[name]) {
        showToast("⚠️ 이미 존재하는 파일 이름입니다!");
        return;
      }
      try {
        const newFileHandle = await dirHandle.getFileHandle(name, { create: true });
        const writable = await newFileHandle.createWritable();
        await writable.write(defaultTemplate);
        await writable.close();
        
        fileHandles[name] = newFileHandle;
        activeFileName = name;
      } catch (err) {
        console.error("Create local file failed: ", err);
      }
    } else {
      if (projectFiles[name]) {
        showToast("⚠️ 이미 존재하는 파일 이름입니다!");
        return;
      }
      projectFiles[name] = defaultTemplate;
      activeFileName = name;
    }

    saveProjectFilesToStorage();
    renderFileDropdown();
    
    loadCurrentFileIntoEditor(defaultTemplate);
    showToast(`➕ 새 파일 [${name}]이 성공적으로 생성되었습니다!`);
  });
}

async function switchActiveFile(newFileName) {
  if (!newFileName || newFileName === activeFileName) return;

  // Reset history stack on file switch to prevent cross-file state leakage
  undoStack = [];
  redoStack = [];
  updateHistoryButtons();

  // 1. Save current active file content
  let currentContent = "";
  if (activeTab === "code" && editorInstance) {
    currentContent = editorInstance.getValue();
  } else {
    currentContent = generateHTML(state);
  }
  
  if (isLocalDirectoryMode) {
    if (activeFileName && fileHandles[activeFileName]) {
      try {
        const writable = await fileHandles[activeFileName].createWritable();
        await writable.write(currentContent);
        await writable.close();
      } catch (e) {
        console.error("Save local file error: ", e);
      }
    }
  } else {
    projectFiles[activeFileName] = currentContent;
  }

  // 2. Load the newly selected file content
  activeFileName = newFileName;
  let newContent = "";
  
  if (isLocalDirectoryMode) {
    try {
      const file = await fileHandles[activeFileName].getFile();
      newContent = await file.text();
    } catch (e) {
      console.error("Read local file error: ", e);
      showToast("⚠️ 파일을 불러오는 중 오류가 발생했습니다.");
      return;
    }
  } else {
    newContent = projectFiles[activeFileName];
  }

  loadCurrentFileIntoEditor(newContent);
  saveProjectFilesToStorage();
  showToast(`📁 ${activeFileName} 파일로 전환되었습니다.`);
}

function loadCurrentFileIntoEditor(htmlContent) {
  if (editorInstance) {
    editorInstance.setValue(htmlContent);
  }

  const parsed = parseHTMLToState(htmlContent);
  if (parsed) {
    state = parsed;
    syncStateToUIElements();
    renderVisualForm();
  }
  
  updatePreview(true);
}

// Auto-saves files directly to physical disk (debounced 300ms via preview callback)
async function autoSaveLocalFile() {
  if (isLocalDirectoryMode && activeFileName && fileHandles[activeFileName]) {
    try {
      let htmlContent = "";
      if (activeTab === "code" && editorInstance) {
        htmlContent = editorInstance.getValue();
      } else {
        htmlContent = generateHTML(state);
      }
      
      const handle = fileHandles[activeFileName];
      const writable = await handle.createWritable();
      await writable.write(htmlContent);
      await writable.close();
    } catch (err) {
      console.error("Local file auto-save failed: ", err);
    }
  }
}

// ==========================================
// ↩️ Undo / Redo History Management System
// ==========================================

function pushToHistory() {
  if (isApplyingHistory) return;

  const stateSnapshot = JSON.stringify(state);

  // Prevent consecutive identical states from cluttering the stack
  if (undoStack.length > 0 && undoStack[undoStack.length - 1] === stateSnapshot) {
    return;
  }

  undoStack.push(stateSnapshot);
  if (undoStack.length > MAX_HISTORY) {
    undoStack.shift();
  }

  // Clear redo stack on new action
  redoStack = [];
  
  updateHistoryButtons();
}

function recordPendingHistory() {
  if (isApplyingHistory) return;

  if (!hasPendingHistory) {
    pushToHistory();
    hasPendingHistory = true;
  }

  // Debounce consecutive typing, drag, or slider actions
  clearTimeout(historyDebounceTimer);
  historyDebounceTimer = setTimeout(() => {
    hasPendingHistory = false;
  }, 800);
}

function undo() {
  if (undoStack.length === 0) return;

  isApplyingHistory = true;

  // Push current state to redo stack
  redoStack.push(JSON.stringify(state));

  // Retrieve previous state
  const prevStateStr = undoStack.pop();
  state = JSON.parse(prevStateStr);

  // Sync state back to UI inputs and forms
  syncStateToUIElements();
  renderVisualForm();

  // Regenerate HTML and update Code Editor
  const html = generateHTML(state);
  if (editorInstance) {
    editorInstance.setValue(html);
  }

  // Auto-save changes back to the Virtual Workspace and localStorage
  projectFiles[activeFileName] = html;
  saveProjectFilesToStorage();

  // Refresh preview
  updatePreview(true);

  isApplyingHistory = false;
  updateHistoryButtons();
  showToast("↩️ 실행을 취소했습니다. (되돌리기)");
}

function redo() {
  if (redoStack.length === 0) return;

  isApplyingHistory = true;

  // Push current state to undo stack
  undoStack.push(JSON.stringify(state));

  // Retrieve next state
  const nextStateStr = redoStack.pop();
  state = JSON.parse(nextStateStr);

  // Sync state back to UI inputs and forms
  syncStateToUIElements();
  renderVisualForm();

  // Regenerate HTML and update Code Editor
  const html = generateHTML(state);
  if (editorInstance) {
    editorInstance.setValue(html);
  }

  // Auto-save changes back to the Virtual Workspace and localStorage
  projectFiles[activeFileName] = html;
  saveProjectFilesToStorage();

  // Refresh preview
  updatePreview(true);

  isApplyingHistory = false;
  updateHistoryButtons();
  showToast("↪️ 실행을 다시 적용했습니다. (다시실행)");
}

function updateHistoryButtons() {
  const undoBtn = document.getElementById("btn-undo");
  const redoBtn = document.getElementById("btn-redo");

  if (undoBtn) {
    if (undoStack.length > 0) {
      undoBtn.removeAttribute("disabled");
      undoBtn.style.opacity = "1";
      undoBtn.style.cursor = "pointer";
    } else {
      undoBtn.setAttribute("disabled", "true");
      undoBtn.style.opacity = "0.4";
      undoBtn.style.cursor = "not-allowed";
    }
  }

  if (redoBtn) {
    if (redoStack.length > 0) {
      redoBtn.removeAttribute("disabled");
      redoBtn.style.opacity = "1";
      redoBtn.style.cursor = "pointer";
    } else {
      redoBtn.setAttribute("disabled", "true");
      redoBtn.style.opacity = "0.4";
      redoBtn.style.cursor = "not-allowed";
    }
  }
}

// ==========================================
// 💾 Centralized Manual Save handler
// ==========================================

async function saveActiveFile(silent = false) {
  let htmlContent = "";
  if (activeTab === "code" && editorInstance) {
    htmlContent = editorInstance.getValue();
  } else {
    htmlContent = generateHTML(state);
  }

  // 1. Commit to Virtual Files Database and browser LocalStorage
  projectFiles[activeFileName] = htmlContent;
  saveProjectFilesToStorage();

  // 2. Commit physically to Local Folder Disk immediately if in Directory Mode
  if (isLocalDirectoryMode && activeFileName && fileHandles[activeFileName]) {
    try {
      const handle = fileHandles[activeFileName];
      const writable = await handle.createWritable();
      await writable.write(htmlContent);
      await writable.close();
      if (!silent) {
        showToast(`💾 로컬 파일 저장 완료! (${activeFileName})`);
      }
    } catch (err) {
      console.error("Local file manual save failed: ", err);
      showToast("⚠️ 디스크 파일 쓰기에 실패했습니다.");
    }
  } else {
    if (!silent) {
      showToast(`💾 가상 브라우저 저장 완료! (${activeFileName})`);
    }
  }
}

// ==========================================
// 💾 Centralized Save As handler
// ==========================================

async function saveActiveFileAs() {
  let htmlContent = "";
  if (activeTab === "code" && editorInstance) {
    htmlContent = editorInstance.getValue();
  } else {
    htmlContent = generateHTML(state);
  }

  // 1. Priority: Try opening Chrome/Edge's native Save File Picker (Windows explorer dialog)
  if (window.showSaveFilePicker) {
    try {
      const options = {
        suggestedName: activeFileName || "gloomy-accordion.html",
        types: [{
          description: 'HTML Files',
          accept: {
            'text/html': ['.html'],
          },
        }],
      };
      
      const newFileHandle = await window.showSaveFilePicker(options);
      
      // Write content directly to physical disk
      const writable = await newFileHandle.createWritable();
      await writable.write(htmlContent);
      await writable.close();
      
      // Register new file in context managers
      if (isLocalDirectoryMode) {
        fileHandles[newFileHandle.name] = newFileHandle;
      } else {
        projectFiles[newFileHandle.name] = htmlContent;
      }
      activeFileName = newFileHandle.name;
      
      // Sync state and drop-downs
      saveProjectFilesToStorage();
      renderFileDropdown();
      
      loadCurrentFileIntoEditor(htmlContent);
      showToast(`💾 파일 브라우저 저장 완료! (${activeFileName})`);
      return;
    } catch (err) {
      if (err.name === 'AbortError') {
        return; // User canceled the save dialog smoothly
      }
      console.warn("showSaveFilePicker blocked or failed, trying Blob download fallback: ", err);
    }
  }

  // 2. Fallback: Trigger standard A-tag Blob download dialog (guarantees browser save window for file:/// sandboxes)
  try {
    const suggested = activeFileName || "gloomy-accordion.html";
    let name = prompt("저장할 파일 이름을 지정해 주세요:", suggested);
    if (!name || name.trim() === "") return;
    
    name = name.trim();
    if (!name.endsWith(".html")) {
      name += ".html";
    }

    const blob = new Blob([htmlContent], { type: "text/html;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    
    const a = document.createElement("a");
    a.href = url;
    a.download = name;
    document.body.appendChild(a);
    a.click();
    
    // Cleanup
    document.body.removeChild(a);
    URL.revokeObjectURL(url);

    // Sync state
    projectFiles[name] = htmlContent;
    activeFileName = name;
    
    saveProjectFilesToStorage();
    renderFileDropdown();
    loadCurrentFileIntoEditor(htmlContent);
    
    showToast(`💾 브라우저 파일 탐색기를 통해 파일이 저장되었습니다! (${activeFileName})`);
  } catch (err) {
    console.error("Save As fallback failed: ", err);
    showToast("⚠️ 디스크 쓰기에 실패했습니다.");
  }
}
