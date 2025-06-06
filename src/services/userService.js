import { auth, firestore } from './firebase';
import {
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
  updateProfile,
  GithubAuthProvider,
  GoogleAuthProvider,
  signInWithPopup,
  sendPasswordResetEmail,
} from 'firebase/auth';
import {
  doc,
  setDoc,
  getDoc,
  updateDoc,
  collection,
  getDocs,
  serverTimestamp,
  arrayUnion,
} from 'firebase/firestore';

// 注册账号（邮箱+密码，支持手机号可自行扩展）
export async function register(email, password, nickname = '') {
  const res = await createUserWithEmailAndPassword(auth, email, password);
  const user = res.user;
  // 注册时顺带建 user 文档
  await setDoc(doc(firestore, 'users', user.uid), {
    uid: user.uid,
    email: user.email,
    nickname: nickname || `用户_${Math.random().toString(36).slice(2, 8)}`,
    createTime: serverTimestamp(),
    favorites: [],
    recents: [],
    theme: 'light',
    messages: [],
  });
  return user;
}

// 登录
export async function login(email, password) {
  const res = await signInWithEmailAndPassword(auth, email, password);
  return res.user;
}

// 获取用户信息
export async function getUserInfo(uid) {
  const ref = doc(firestore, 'users', uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) throw new Error('用户不存在');
  return snap.data();
}

// 修改昵称
export async function setUserNick(uid, nickname) {
  await updateDoc(doc(firestore, 'users', uid), { nickname });
  // 同步到 auth（可选）
  const user = auth.currentUser;
  if (user && user.uid === uid) {
    await updateProfile(user, { displayName: nickname });
  }
}

// 设置日间/夜间模式
export async function setUserTheme(uid, theme) {
  await updateDoc(doc(firestore, 'users', uid), { theme });
}

// 收藏夹（假设存 user 文档的 favorites 字段为 fileId 数组）
export async function getFavorites(uid) {
  const info = await getUserInfo(uid);
  return info.favorites || [];
}
export async function addFavorite(uid, fileId) {
  await updateDoc(doc(firestore, 'users', uid), {
    favorites: arrayUnion(fileId),
  });
}
export async function removeFavorite(uid, fileId) {
  // firestore 没有 arrayRemove，可以先查再 set
  const info = await getUserInfo(uid);
  const arr = (info.favorites || []).filter((id) => id !== fileId);
  await updateDoc(doc(firestore, 'users', uid), { favorites: arr });
}

// 最近文件（同理，存 recents 字段数组）
export async function getRecentFiles(uid) {
  const info = await getUserInfo(uid);
  return info.recents || [];
}
export async function addRecentFile(uid, fileId) {
  await updateDoc(doc(firestore, 'users', uid), {
    recents: arrayUnion(fileId),
  });
}

// 忘记密码（发重置邮件）
export async function resetPassword(email) {
  const querySnapshot = await getDocs(collection(firestore, 'users'));
  const userExists = querySnapshot.docs.some((doc) => doc.data().email === email);

  if (!userExists) {
    throw new Error('该邮箱未注册');
  }

  await sendPasswordResetEmail(auth, email);
}

// 消息（这里假设 messages 字段为数组，也可以用子集合 users/{uid}/messages/）
export async function getMessages(uid) {
  const info = await getUserInfo(uid);
  return info.messages || [];
}
export async function addMessage(uid, message) {
  await updateDoc(doc(firestore, 'users', uid), {
    messages: arrayUnion(message),
  });
}

// 退出登录
export async function logout() {
  await auth.signOut();
}

// GitHub 登录
export async function loginWithGithub() {
  const provider = new GithubAuthProvider();
  const result = await signInWithPopup(auth, provider);
  // 如果是新用户，创建用户文档
  const userDoc = await getDoc(doc(firestore, 'users', result.user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(firestore, 'users', result.user.uid), {
      uid: result.user.uid,
      email: result.user.email,
      nickname: result.user.displayName || `用户_${Math.random().toString(36).slice(2, 8)}`,
      createTime: serverTimestamp(),
      favorites: [],
      recents: [],
      theme: 'light',
      messages: [],
    });
  }
  return result.user;
}

// Google 登录
export async function loginWithGoogle() {
  const provider = new GoogleAuthProvider();
  const result = await signInWithPopup(auth, provider);
  // 如果是新用户，创建用户文档
  const userDoc = await getDoc(doc(firestore, 'users', result.user.uid));
  if (!userDoc.exists()) {
    await setDoc(doc(firestore, 'users', result.user.uid), {
      uid: result.user.uid,
      email: result.user.email,
      nickname: result.user.displayName || `用户_${Math.random().toString(36).slice(2, 8)}`,
      createTime: serverTimestamp(),
      favorites: [],
      recents: [],
      theme: 'light',
      messages: [],
    });
  }
  return result.user;
}
