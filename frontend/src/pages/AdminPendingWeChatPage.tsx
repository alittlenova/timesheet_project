import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

type Role = "employee" | "manager" | "admin";
type Status = "first_come" | "pending" | "approved" | "rejected" | "suspended";

type User = {
  id: number;
  name?: string;
  mobile?: string;
  email?: string;
  role: Role;
  status: Status;
};

type Me = {
  id: number;
  name?: string;
  role: Role;
};

type Department = { id: number; name: string };

const api = axios.create({ baseURL: "http://localhost:8000" });

/** 行组件：每个待审批用户一行（把 hooks 放进子组件，避免在 map 中直接用 hooks） */
function PendingRow(props: {
  me: Me | null;
  user: User;
  allDepartments: Department[];
  managerDeptIds: Set<number>;
  onApproved: () => void;
  onRejected: () => void;
}) {
  const { me, user, allDepartments, managerDeptIds, onApproved, onRejected } =
    props;

  // 可选部门（管理员=全量；经理=仅自己所在部门）
  const selectableDepartments = useMemo(() => {
    if (!me) return [];
    if (me.role === "admin") return allDepartments;
    if (me.role === "manager")
      return allDepartments.filter((d) => managerDeptIds.has(d.id));
    return [];
  }, [me, allDepartments, managerDeptIds]);

  // 选择的部门（空串=不入部门）
  const [dept, setDept] = useState<string>("");

  const approve = async () => {
    try {
      // 1) 先通过
      await api.post(`/users/${user.id}/approve`);
      // 2) 若选了部门 -> 加部门
      if (dept) {
        const deptId = parseInt(dept, 10);
        if (Number.isFinite(deptId)) {
          await api.post(`/departments/${deptId}/members`, {
            user_ids: [user.id],
          });
        }
      }
      onApproved();
    } catch (e: any) {
      alert("通过失败：" + (e?.response?.data?.detail || e.message));
    }
  };

  const reject = async () => {
    try {
      await api.post(`/users/${user.id}/reject`);
      onRejected();
    } catch (e: any) {
      alert("驳回失败：" + (e?.response?.data?.detail || e.message));
    }
  };

  return (
    <div className="grid grid-cols-7 gap-2 items-center border-t py-2 text-sm">
      <div>#{user.id}</div>
      <div>{user.name || "-"}</div>
      <div>{user.mobile || "-"}</div>
      <div>{user.email || "-"}</div>
      <div>{user.role}</div>
      <div className="flex items-center gap-2">
        <select
          className="border rounded px-2 py-1"
          value={dept}
          onChange={(e) => setDept(e.target.value)}
        >
          <option value="">（无）</option>
          {selectableDepartments.map((d) => (
            <option key={d.id} value={String(d.id)}>
              {d.name}（ID:{d.id}）
            </option>
          ))}
        </select>
      </div>
      <div className="flex gap-2 justify-end">
        <Button size="sm" onClick={approve}>
          通过
        </Button>
        <Button size="sm" variant="destructive" onClick={reject}>
          驳回
        </Button>
      </div>
    </div>
  );
}

export default function AdminPendingWeChatPage() {
  const [token, setToken] = useState("");
  const [me, setMe] = useState<Me | null>(null);

  const [departments, setDepartments] = useState<Department[]>([]);
  const [managerDeptIds, setManagerDeptIds] = useState<Set<number>>(new Set());

  const [allUsers, setAllUsers] = useState<User[]>([]);
  const [q, setQ] = useState("");

  // login form
  const [loginMobile, setLoginMobile] = useState("");
  const [loginPwd, setLoginPwd] = useState("");

  // ---- bootstrap token
  useEffect(() => {
    const t = localStorage.getItem("admintoken") || "";
    if (t) setToken(t);
  }, []);

  // ---- token change
  useEffect(() => {
    if (!token) {
      delete api.defaults.headers.common["Authorization"];
      setMe(null);
      setAllUsers([]);
      setDepartments([]);
      setManagerDeptIds(new Set());
      return;
    }
    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    (async () => {
      try {
        await loadMeAndDepts();
        await refreshUsers();
      } catch (e) {
        console.error(e);
      }
    })();
  }, [token]);

  const loadMeAndDepts = async () => {
    const meRes = await api.get<Me>("/auth/me");
    setMe(meRes.data);

    // 部门全集
    const dRes = await api.get<Department[]>("/departments/");
    setDepartments(dRes.data || []);

    // 若是 manager，找出“我所在的部门”
    if (meRes.data.role === "manager") {
      const set = new Set<number>();
      for (const d of dRes.data) {
        const det = await api.get<{ users: User[] }>(`/departments/${d.id}`);
        if ((det.data.users || []).some((u) => u.id === meRes.data.id)) {
          set.add(d.id);
        }
      }
      setManagerDeptIds(set);
    } else {
      setManagerDeptIds(new Set());
    }
  };

  const refreshUsers = async () => {
    const uRes = await api.get<User[]>("/users/");
    // “待审批”即 pending；first_come 通常是首次登录把资料放进来但未提交，这里只展示 pending
    const pendings = (uRes.data || []).filter((u) => u.status === "pending");
    // 最新的靠前一点
    pendings.sort((a, b) => (b.id ?? 0) - (a.id ?? 0));
    setAllUsers(pendings);
  };

  const handleLogin = async () => {
    try {
      const res = await api.post("/auth/login", {
        mobile: loginMobile,
        password: loginPwd,
      });
      const { token: tk, user } = res.data as { token: string; user: Me };
      if (user.role !== "admin" && user.role !== "manager") {
        alert("仅 admin / manager 可使用该页面");
        return;
      }
      localStorage.setItem("admintoken", tk);
      setToken(tk);
    } catch (e: any) {
      alert("登录失败：" + (e?.response?.data?.detail || e.message));
    }
  };

  const logout = () => {
    localStorage.removeItem("admintoken");
    setToken("");
  };

  const filtered = useMemo(() => {
    const k = q.trim().toLowerCase();
    if (!k) return allUsers;
    return allUsers.filter((u) => {
      const s = `${u.id} ${u.name || ""} ${u.mobile || ""} ${u.email || ""}`.toLowerCase();
      return s.includes(k);
    });
  }, [q, allUsers]);

  // 管理员：一键清理 first_come / rejected（逐个 DELETE）
  const purgeJunk = async () => {
    if (!me || me.role !== "admin") return;
    if (!confirm("确认清理所有 first_come / rejected 用户吗？该操作不可恢复。")) return;

    try {
      const res = await api.get<User[]>("/users/");
      const junk = (res.data || []).filter(
        (u) => u.status === "first_come" || u.status === "rejected"
      );
      for (const u of junk) {
        await api.delete(`/users/${u.id}`);
      }
      alert(`已清理 ${junk.length} 个用户`);
      await refreshUsers();
    } catch (e: any) {
      alert("清理失败：" + (e?.response?.data?.detail || e.message));
    }
  };

  if (!token) {
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">管理员/经理登录</h2>
            <div>
              <Label>手机号</Label>
              <Input value={loginMobile} onChange={(e) => setLoginMobile(e.target.value)} />
            </div>
            <div>
              <Label>密码</Label>
              <Input
                type="password"
                value={loginPwd}
                onChange={(e) => setLoginPwd(e.target.value)}
              />
            </div>
            <Button onClick={handleLogin}>登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">微信待审批用户</h1>
        <div className="flex gap-2 items-center">
          {me && (
            <span className="text-sm text-gray-500">
              {me.name || "-"}（{me.role}）
            </span>
          )}
          {me?.role === "admin" && (
            <Button variant="destructive" onClick={purgeJunk}>
              一键清理 first_come / rejected
            </Button>
          )}
          <Button variant="outline" onClick={logout}>
            退出登录
          </Button>
        </div>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              className="max-w-xs"
              placeholder="搜索姓名/手机号/邮箱/ID"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
            <div className="text-sm text-gray-500">共 {filtered.length} 人</div>
          </div>

          <div className="grid grid-cols-7 bg-gray-50 text-sm font-medium px-3 py-2 rounded-t">
            <div>ID</div>
            <div>姓名</div>
            <div>手机号</div>
            <div>邮箱</div>
            <div>角色</div>
            <div>准入部门</div>
            <div className="text-right">操作</div>
          </div>

          {filtered.length === 0 ? (
            <div className="px-3 py-8 text-center text-sm text-gray-500 border-t">
              当前没有待审批用户
            </div>
          ) : (
            filtered.map((u) => (
              <PendingRow
                key={u.id}
                me={me}
                user={u}
                allDepartments={departments}
                managerDeptIds={managerDeptIds}
                onApproved={refreshUsers}
                onRejected={refreshUsers}
              />
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
