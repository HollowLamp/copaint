import React, { useState } from "react";
import { Component as FileDemo } from "./FileDemo";
import { Component as FileShareDemo } from "./FileShareDemo";
import { Component as FileCopyDemo } from "./FileCopyDemo";
import { Component as FileContentDemo } from "./FileContentDemo";
import { Component as UserDemo } from "./UserDemo";

const tabs = [
  { label: "文件", comp: FileDemo },
  { label: "分享/权限", comp: FileShareDemo },
  { label: "副本", comp: FileCopyDemo },
  { label: "内容", comp: FileContentDemo },
  { label: "用户", comp: UserDemo },
];

export const Component = () => {
  const [tab, setTab] = useState(0);
  const TabComp = tabs[tab].comp;
  return (
    <div>
      <div style={{ display: "flex", gap: 8, margin: 8 }}>
        {tabs.map((t, i) =>
          <button key={i} onClick={() => setTab(i)} style={{ fontWeight: i === tab ? "bold" : "normal" }}>{t.label}</button>
        )}
      </div>
      <TabComp />
    </div>
  );
};
