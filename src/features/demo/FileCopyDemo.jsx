import React, { useState } from "react";
import { copyFile } from "../../services/fileService";
import { Button } from '../../components/button/Button';

export const Component = () => {
  const [fileId, setFileId] = useState("");
  async function handleCopy() {
    await copyFile(fileId);
    alert("已创建副本");
  }
  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h3>文件副本 Demo</h3>
      <input value={fileId} onChange={e => setFileId(e.target.value)} placeholder="需要复制的文件ID" />
      <Button onClick={handleCopy}>创建副本</Button>
    </div>
  );
};
