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
  try {
    const docRef = doc(firestore, "files", fileId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) return null;

    const data = snap.data() || {};
    console.log('获取到的原始数据:', data);

    // 如果有content字段，恢复其中的嵌套数组
    if (data.content) {
      data.content = restoreNestedArrays(data.content);
      console.log('恢复嵌套数组后的数据:', data.content);
    }

    return data;
  } catch (error) {
    console.error('获取文件内容失败:', error);
    throw error;
  }
}

// 深度清理嵌套数组，将其转换为Firestore支持的格式
function cleanNestedArrays(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (Array.isArray(obj)) {
    // 将数组转换为对象格式，使用索引作为键
    const cleanedObj = {};
    obj.forEach((item, index) => {
      cleanedObj[index] = cleanNestedArrays(item);
    });
    // 添加特殊标记，表示这是一个数组
    cleanedObj.__isArray = true;
    cleanedObj.__length = obj.length;
    return cleanedObj;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    const cleanedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        cleanedObj[key] = cleanNestedArrays(obj[key]);
      }
    }
    return cleanedObj;
  }

  return obj;
}

// 恢复嵌套数组，将清理后的格式转换回原始数组
function restoreNestedArrays(obj) {
  if (obj === null || obj === undefined) {
    return obj;
  }

  if (typeof obj === 'object' && obj.constructor === Object) {
    // 检查是否是被转换的数组
    if (obj.__isArray === true && typeof obj.__length === 'number') {
      const restoredArray = [];
      for (let i = 0; i < obj.__length; i++) {
        if (obj.hasOwnProperty(i)) {
          restoredArray[i] = restoreNestedArrays(obj[i]);
        }
      }
      return restoredArray;
    }

    // 普通对象，递归处理其属性
    const restoredObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key) && key !== '__isArray' && key !== '__length') {
        restoredObj[key] = restoreNestedArrays(obj[key]);
      }
    }
    return restoredObj;
  }

  return obj;
}

// 保存文件内容
export async function saveFileContent(fileId, content) {
  try {
    console.log('开始保存文件内容，原始数据:', content);

    // 清理嵌套数组
    const cleanedContent = cleanNestedArrays(content);
    console.log('清理后的数据:', cleanedContent);

    const docRef = doc(firestore, "files", fileId);
    await updateDoc(docRef, {
      content: cleanedContent,
      lastEditTime: serverTimestamp()
    });

    console.log('文件保存成功');
  } catch (error) {
    console.error('保存文件内容失败:', error);
    throw error;
  }
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

// 导出辅助函数，供其他模块使用
export { cleanNestedArrays, restoreNestedArrays };