// firebase-config.js — Firebase 콘솔에서 발급받은 설정값을 여기에 채워넣으세요.
// 위치: Firebase 콘솔 > 프로젝트 설정(톱니바퀴) > 일반 > "내 앱" 섹션 > SDK 설정 및 구성
// 이 값들은 브라우저에 그대로 노출돼도 안전합니다 — 실제 보안은 Firestore 규칙이 담당해요.
const firebaseConfig = {
  apiKey: "AIzaSyATR0byxtNna0zkPFkt3GwkBCLUPV14te0",
  authDomain: "feathermax-d6727.firebaseapp.com",
  projectId: "feathermax-d6727",
  storageBucket: "feathermax-d6727.firebasestorage.app",
  messagingSenderId: "247206543432",
  appId: "1:247206543432:web:dec1d71f7e587c8d77d87d"
};

// 아이디(username)를 Firebase Auth가 요구하는 이메일 형식으로 바꿀 때 붙이는 가짜 도메인.
// 사용자에게는 절대 노출되지 않고, 로그인 화면엔 "아이디"만 보여요.
const AUTH_FAKE_EMAIL_DOMAIN = "artifact-ledger.local";
