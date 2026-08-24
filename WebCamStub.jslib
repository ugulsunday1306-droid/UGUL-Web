// WebGL 빌드에서 웹캠 네이티브 심볼이 없어 wasm-ld 링크가 실패하는 것을 막는 스텁.
// 브라우저 데모에서는 웹캠 기능을 사용하지 않으므로 빈 구현으로 충분하다.
// 경로: Assets/Plugins/WebGL/WebCamStub.jslib
var WebCamStubPlugin = {
  EnumerateVideoFormats: function () {
    return 0;
  },
};

mergeInto(LibraryManager.library, WebCamStubPlugin);
