import React, { useState } from "react";
import { register, login, getUserInfo, setUserNick, getFavorites, getRecentFiles, getMessages } from "../../services/userService";
import { Button } from '../../components/button/Button';

export const Component = () => {
  const [phone, setPhone] = useState("");
  const [pwd, setPwd] = useState("");
  const [msg, setMsg] = useState("");
  async function handleRegister() {
    await register(phone, pwd);
    setMsg("注册成功");
  }
  async function handleLogin() {
    await login(phone, pwd);
    setMsg("登录成功");
  }
  // 其他功能依次实现即可
  return (
    <div style={{ maxWidth: 400, margin: "40px auto" }}>
      <h3>用户功能 Demo</h3>
      <input value={phone} onChange={e => setPhone(e.target.value)} placeholder="手机号/账号" />
      <input value={pwd} onChange={e => setPwd(e.target.value)} type="password" placeholder="密码" />
      <Button onClick={handleRegister}>注册</Button>
      <Button onClick={handleLogin}>登录</Button>
      <div>{msg}</div>
    </div>
  );
};
