import { firestore } from './firebase';
import {
  collection,
  addDoc,
  getDocs,
  updateDoc,
  deleteDoc,
  doc,
  query,
  where,
  serverTimestamp,
  getDoc
} from 'firebase/firestore';

// 新建文件
export async function createFile({ fileName, ownerId }) {
  const docRef = await addDoc(collection(firestore, "files"), {
    fileName,
    ownerId,
    collaborators: [],
    content: {},
    createTime: serverTimestamp(),
    lastEditTime: serverTimestamp(),
    recycleTag: false,
    recycleTime: null,
    shareLink: "",
    enablePassword: false,
    sharePassword: ""
  });
  return docRef.id;
}

// 查询我的文件和回收站
export async function getMyFiles(ownerId, isRecycle = false) {
  const q = query(
    collection(firestore, "files"),
    where("ownerId", "==", ownerId),
    where("recycleTag", "==", !!isRecycle)
  );
  const snap = await getDocs(q);
  return snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
}

// 重命名
export async function renameFile(fileId, newName) {
  await updateDoc(doc(firestore, "files", fileId), {
    fileName: newName,
    lastEditTime: serverTimestamp()
  });
}

// 回收
export async function recycleFile(fileId) {
  await updateDoc(doc(firestore, "files", fileId), {
    recycleTag: true,
    recycleTime: serverTimestamp()
  });
}

// 恢复
export async function restoreFile(fileId) {
  await updateDoc(doc(firestore, "files", fileId), {
    recycleTag: false,
    recycleTime: null
  });
}

// 彻底删除
export async function deleteFile(fileId) {
  await deleteDoc(doc(firestore, "files", fileId));
}

// 获取文件内容
export async function getFileContent(fileId) {
  const docRef = doc(firestore, "files", fileId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) return null;
  return snap.data() || {};
}

// 保存文件内容
export async function saveFileContent(fileId, content) {
  const docRef = doc(firestore, "files", fileId);
  await updateDoc(docRef, {
    content,
    lastEditTime: serverTimestamp()
  });
}

// 复制文件
export async function copyFile(fileId) {
  const docRef = doc(firestore, "files", fileId);
  const snap = await getDoc(docRef);
  if (!snap.exists()) throw new Error("文件不存在");
  const old = snap.data();
  await addDoc(collection(firestore, "files"), {
    ...old,
    fileName: old.fileName + "-副本",
    createTime: serverTimestamp(),
    lastEditTime: serverTimestamp(),
    // 可以去掉协作者等
  });
}

// 获取分享链接
export async function getFileShareLink(fileId) {
  // 你可以直接返回某个链接，也可以用fileId生成链接
  return window.location.origin + "/canvas/" + fileId;
}

// 设置分享密码
export async function setFilePassword(fileId, password) {
  const docRef = doc(firestore, "files", fileId);
  await updateDoc(docRef, {
    enablePassword: !!password,
    sharePassword: password,
  });
}

// 设置协作者
export async function setCollaborators(fileId, collaborators) {
  // collaborators是形如[{userId, permission}]
  const docRef = doc(firestore, "files", fileId);
  await updateDoc(docRef, {
    collaborators
  });
}