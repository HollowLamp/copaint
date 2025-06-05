import React, { useState } from "react";
import { getFileShareLink, setFilePassword, setCollaborators } from "../../services/fileService";
import { Button } from '../../components/button/Button';

export const Component = () => {
  const [fileId, setFileId] = useState("");
  const [link, setLink] = useState("");
  const [password, setPassword] = useState("");
  const [collaborators, setCollabInput] = useState("");

  async function handleGetLink() {
    const res = await getFileShareLink(fileId);
    setLink(res);
  }
  async function handleSetPassword() {
    await setFilePassword(fileId, password);
    alert("已设置密码");
  }
  async function handleSetCollaborators() {
    const arr = collaborators.split(",").map(item => {
      const [userId, permission] = item.split(":");
      return { userId, permission };
    });
    await setCollaborators(fileId, arr);
    alert("已设置协作者");
  }

  return (
    <div style={{ maxWidth: 500, margin: "40px auto" }}>
      <h3>分享/协作者功能 Demo</h3>
      <input value={fileId} onChange={e => setFileId(e.target.value)} placeholder="文件ID" />
      <Button onClick={handleGetLink}>获取分享链接</Button>
      <div>分享链接: {link}</div>
      <input value={password} onChange={e => setPassword(e.target.value)} placeholder="分享密码" />
      <Button onClick={handleSetPassword}>设置密码</Button>
      <input value={collaborators} onChange={e => setCollabInput(e.target.value)} placeholder="协作者 uid:edit,uid2:read" />
      <Button onClick={handleSetCollaborators}>设置协作者权限</Button>
    </div>
  );
};
