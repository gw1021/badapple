# 사과 받아먹기 (모바일 기울기 게임)

- 휴대폰을 좌우로 기울여 바구니를 움직여 떨어지는 사과를 받아 점수를 올리는 웹 게임입니다.
- 터치 드래그/데스크탑 키보드(← →, A/D) 폴백을 지원합니다.
- iOS는 자이로/가속도 센서 권한을 요구하므로 시작 시 권한 팝업이 나타납니다.

## 실행 방법

로컬에서 간단히 실행하려면 파워셸에서 아래 중 하나를 택하세요.

### 선택 1) 간단한 파이썬 서버
```powershell
py -m http.server 5173 --directory .
```
그런 다음 브라우저에서 다음 주소로 접속:
```
http://localhost:5173/
```

### 선택 2) VS Code Live Server 확장 사용
- "Live Server" 확장을 설치하고 `index.html`에서 "Open with Live Server"를 누릅니다.

## 조작법
- 기본: 기울기(센서). "시작하기"를 누르면 iOS에서 권한을 요청합니다.
- 대안: "터치 조작으로 시작" 버튼을 눌러 터치 드래그로 이동.
- 데스크탑: 방향키(← →) 또는 A/D.
- 게임 오버 화면에서 "수평 재보정"으로 현재 기울기를 0으로 보정할 수 있습니다.

## 참고
- 일부 안드로이드/브라우저는 보안 정책으로 HTTPS 환경에서만 센서 이벤트를 허용할 수 있습니다. 로컬 개발 시 Live Server의 주소(https 아님)에서는 정상 동작하지 않을 수 있습니다. 그 경우 로컬 HTTPS나 실제 호스팅 환경에서 테스트하세요.

## GitHub Pages 배포
1. 이 폴더의 내용을 새 GitHub 저장소에 푸시합니다. 기본 브랜치를 `main`으로 사용하세요.
2. GitHub에서 Settings → Pages로 이동합니다.
3. Build and deployment에서 Source를 "GitHub Actions"로 설정합니다.
4. 자동으로 생성된 워크플로(`.github/workflows/pages.yml`)가 main 브랜치 푸시 시 실행되어 사이트를 배포합니다.
5. 배포가 완료되면 Actions 탭 또는 Settings → Pages에서 배포 URL을 확인할 수 있습니다.

주의: 저장소가 공개(public)여야 사용자 페이지(https://<사용자명>.github.io/<저장소명>/)로 접근할 수 있습니다. 비공개 저장소는 GitHub Pro 이상에서 Pages가 제한적으로 동작합니다.
