import React, { useEffect, useState } from 'react';
import {
  createFile,
  getMyFiles,
  renameFile,
  deleteFile,
  recycleFile,
  restoreFile,
} from '../../services/fileService';
import { useAuthUser } from '../../hooks/useAuthUser';
import { Button } from '../../components/button/Button';

export const Component = () => {
  const { user } = useAuthUser(); // 你可以自定义hook监听用户
  const [files, setFiles] = useState([]);
  const [fileName, setFileName] = useState('');
  const [editId, setEditId] = useState('');
  const [editName, setEditName] = useState('');
  const [tab, setTab] = useState('my'); // my:我的文件 recycle:回收站

  useEffect(() => {
    if (user) fetchFiles();
    // eslint-disable-next-line
  }, [user, tab]);

  async function fetchFiles() {
    const res = await getMyFiles(user.uid, tab === 'recycle');
    setFiles(res);
  }

  async function handleCreate() {
    if (!fileName) return;
    await createFile({ fileName, ownerId: user.uid });
    setFileName('');
    fetchFiles();
  }

  async function handleRename(id) {
    await renameFile(id, editName);
    setEditId('');
    setEditName('');
    fetchFiles();
  }

  async function handleRecycle(id) {
    await recycleFile(id);
    fetchFiles();
  }

  async function handleRestore(id) {
    await restoreFile(id);
    fetchFiles();
  }

  async function handleDelete(id) {
    await deleteFile(id);
    fetchFiles();
  }

  return (
    <div style={{ maxWidth: 600, margin: '40px auto' }}>
      <h3>文件基础功能 Demo</h3>
      <Button onClick={() => setTab('my')}>我的文件</Button>
      <Button onClick={() => setTab('recycle')}>回收站</Button>
      {tab === 'my' && (
        <div style={{ margin: 12 }}>
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            placeholder="新文件名"
          />
          <Button onClick={handleCreate}>新建文件</Button>
        </div>
      )}
      <ul>
        {files.map((f) => (
          <li key={f.id}>
            {editId === f.id ? (
              <>
                <input value={editName} onChange={(e) => setEditName(e.target.value)} />
                <Button onClick={() => handleRename(f.id)}>保存</Button>
                <Button
                  onClick={() => {
                    setEditId('');
                    setEditName('');
                  }}
                >
                  取消
                </Button>
              </>
            ) : (
              <>
                <span>{f.fileName}</span>
                <Button
                  onClick={() => {
                    setEditId(f.id);
                    setEditName(f.fileName);
                  }}
                >
                  重命名
                </Button>
                {tab === 'my' ? (
                  <>
                    <Button onClick={() => handleRecycle(f.id)}>回收</Button>
                    <Button onClick={() => handleDelete(f.id)} style={{ color: 'red' }}>
                      彻底删除
                    </Button>
                  </>
                ) : (
                  <>
                    <Button onClick={() => handleRestore(f.id)}>恢复</Button>
                    <Button onClick={() => handleDelete(f.id)} style={{ color: 'red' }}>
                      彻底删除
                    </Button>
                  </>
                )}
              </>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
};
