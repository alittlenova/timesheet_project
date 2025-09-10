// AdminTimesheetsPage.tsx（替换整文件）

import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Link } from "react-router-dom";

const PAGE_SIZE = 10;

const STATUS_UI: Record<string, { text: string; cls: string }> = {
  submitted: { text: "待审核", cls: "bg-yellow-100 text-yellow-800" },
  approved: { text: "已通过", cls: "bg-green-100 text-green-800" },
  rejected: { text: "已驳回", cls: "bg-red-100 text-red-800" },
};

type User = {
  id: number;
  name: string;
  mobile?: string;
  role: "employee" | "manager" | "admin";
};

type LoggedInUser = {
  id: number;
  name: string;
  role: "employee" | "manager" | "admin";
  mobile?: string;
};

type Timesheet = {
  id: number;
  user_id: number;
  project_id: number | null;

  // 新结构：仅 hours + 扩展字符串
  hours: number;
  note?: string | null;

  submit_time?: string | null;
  fill_id?: string | null;
  answer_time?: string | null;
  nickname?: string | null;
  weekly_summary?: string | null;
  project_group_filter?: string | null;
  director_filter?: string | null;
  week_no?: string | null;
  pm_reduce_hours?: string | null;
  identified_by?: string | null;
  reduce_desc?: string | null;
  director_reduce_hours?: string | null;
  group_reduce_hours?: string | null;
  reason_desc?: string | null;

  status: "submitted" | "approved" | "rejected";
  created_at?: string;
  updated_at?: string;
};

type PageResp = {
  items: Timesheet[];
  page: number;
  size: number;
  total: number;
};

type Project = { id: number; name: string; status?: string };

// ── Axios：固定走 https 绝对地址，避免任何相对/改写带来的混合内容
const api = axios.create({
  baseURL: "/api/",
  timeout: 15000,
});

api.interceptors.request.use((cfg) => {
  console.log("[REQ]", cfg.method?.toUpperCase(), `${cfg.baseURL ?? ""}${cfg.url ?? ""}`, cfg.params || "");
  return cfg;
});
api.interceptors.response.use(
  (res) => {
    console.log("[RES]", res.status, `${res.config.baseURL ?? ""}${res.config.url ?? ""}`);
    return res;
  },
  (err) => {
    const cfg = err.config || {};
    console.error("[ERR]", `${cfg.baseURL ?? ""}${cfg.url ?? ""}`, err.message);
    return Promise.reject(err);
  }
);

export default function AdminTimesheetsPage() {
  // 登录
  const [token, setToken] = useState("");
  const [loginForm, setLoginForm] = useState({ mobile: "", password: "" });
  const [me, setMe] = useState<LoggedInUser | null>(null);

  // 可见性：允许的用户集合（null 表示全员）
  const [allowedUserIds, setAllowedUserIds] = useState<Set<number> | null>(null);

  // 用户与筛选
  const [users, setUsers] = useState<User[]>([]);
  const [userQuery, setUserQuery] = useState("");
  const [selectedUserId, setSelectedUserId] = useState<number | null>(null);

  // 待审核计数（user_id -> count）
  const [pendingMap, setPendingMap] = useState<Record<number, number>>({});
  const [pendingOnly, setPendingOnly] = useState(false);

  // 工时筛选 & 分页
  const [status, setStatus] = useState<"" | "submitted" | "approved" | "rejected">("");
  const [page, setPage] = useState(1);
  const [pageData, setPageData] = useState<PageResp | null>(null);

  // 编辑态
  const [editingId, setEditingId] = useState<number | null>(null);
  const [editForm, setEditForm] = useState({
    hours: "",
    project_id: "", // 下拉值（字符串），空串代表 NULL
    note: "",

    submit_time: "",
    fill_id: "",
    answer_time: "",
    nickname: "",
    weekly_summary: "",
    project_group_filter: "",
    director_filter: "",
    week_no: "",
    pm_reduce_hours: "",
    identified_by: "",
    reduce_desc: "",
    director_reduce_hours: "",
    group_reduce_hours: "",
    reason_desc: "",
  });

  // 项目（供下拉）
  const [projects, setProjects] = useState<Project[]>([]);
  const projectNameMap = useMemo(() => {
    const m = new Map<number, string>();
    projects.forEach((p) => m.set(p.id, p.name));
    return m;
  }, [projects]);

  const totalPages = useMemo(
    () => (pageData ? Math.max(1, Math.ceil(pageData.total / pageData.size)) : 1),
    [pageData]
  );

  // 恢复 token
  useEffect(() => {
    const t = localStorage.getItem("admintoken") || "";
    if (t) setToken(t);
  }, []);

  // token 变化：挂/卸
  useEffect(() => {
    if (!token) {
      delete api.defaults.headers.common["Authorization"];
      setMe(null);
      setAllowedUserIds(null);
      setUsers([]);
      setSelectedUserId(null);
      setPendingMap({});
      setPageData(null);
      setProjects([]);
      return;
    }

    api.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    (async () => {
      try {
        const visible = await loadVisibility(); // 可见集合
        await fetchUsersAndCounts(visible);
        await fetchProjects();
      } catch {
        /* ignore */
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token]);

  // 切换用户/状态/页码时拉该用户工时
  useEffect(() => {
    if (!token || !selectedUserId) return;
    if (allowedUserIds && !allowedUserIds.has(selectedUserId)) return; // 不可见则不请求
    fetchTimesheets();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [token, selectedUserId, status, page, allowedUserIds]);

  // ===== 可见性：返回集合，避免竞态 =====
  const loadVisibility = async (): Promise<Set<number> | null> => {
    const meRes = await api.get<LoggedInUser>("auth/me");
    const meUser = meRes.data;
    setMe(meUser);

    if (meUser.role === "admin") {
      setAllowedUserIds(null);
      return null; // 全员可见
    }

    if (meUser.role === "manager") {
      const deptList = await api.get<{ id: number; name: string }[]>("departments/");
      const visible = new Set<number>();
      for (const d of deptList.data) {
        const detail = await api.get<{ id: number; name: string; users: User[] }>(
          `departments/${d.id}`
        );
        const usersInDept = detail.data.users || [];
        if (usersInDept.some((u) => u.id === meUser.id)) {
          usersInDept.forEach((u) => visible.add(u.id));
        }
      }
      setAllowedUserIds(visible);
      return visible;
    }

    // 其它角色不可见
    const v = new Set<number>();
    setAllowedUserIds(v);
    return v;
  };

  // ===== 用户 & 待审计数 =====
  const fetchUsersAndCounts = async (visible?: Set<number> | null) => {
    try {
      const [uRes, cRes] = await Promise.all([
        api.get<User[]>("/users/"),
        api.get<{ user_id: number; count: number }[]>("timesheets/counts/", {
          params: { status: "submitted" },
        }),
      ]);

      const visibility = visible !== undefined ? visible : allowedUserIds;

      let list = [...uRes.data];
      if (visibility) list = list.filter((u) => visibility.has(u.id));
      list.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setUsers(list);

      const map: Record<number, number> = {};
      for (const r of cRes.data) {
        if (!visibility || visibility.has(r.user_id)) map[r.user_id] = r.count;
      }
      setPendingMap(map);

      if (!selectedUserId && list.length) setSelectedUserId(list[0].id);
      if (selectedUserId && visibility && !visibility.has(selectedUserId)) {
        setSelectedUserId(list.length ? list[0].id : null);
      }
    } catch (err: any) {
      alert("拉取用户或计数失败：" + (err.response?.data?.detail || err.message));
    }
  };

  // ===== 项目列表（编辑下拉用） =====
  const fetchProjects = async () => {
    try {
      const res = await api.get<Project[]>("projects/");
      const actives = res.data.filter((p) => !p.status || p.status === "active");
      actives.sort((a, b) => (a.name || "").localeCompare(b.name || ""));
      setProjects(actives);
    } catch (err: any) {
      alert("拉取项目失败：" + (err.response?.data?.detail || err.message));
    }
  };

  // ===== 工时 =====
  const handleHttpError = (err: any, fallbackMsg: string) => {
    const msg = err?.response?.data?.detail || err.message || fallbackMsg;
    if (err?.response?.status === 401) {
      alert("登录已过期，请重新登录");
      handleLogout();
      return;
    }
    alert(fallbackMsg + "：" + msg);
  };

  const fetchTimesheets = async () => {
    if (!selectedUserId) return;
    try {
      const res = await api.get<PageResp>("/timesheets", {
        params: {
          page,
          size: PAGE_SIZE,
          user_id: selectedUserId,
          status: status || undefined,
        },
      });
      setPageData(res.data);
    } catch (err: any) {
      handleHttpError(err, "拉取工时失败");
    }
  };

  // ===== 登录 / 登出 =====
  const handleLogin = async () => {
    try {
      console.log("[LOGIN] click", loginForm);
      // 同域 /admin 页面，直接走 /api 相对地址（浏览器会补成 https://wentian.wang/api/...）
      const r = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(loginForm),
      });
      if (!r.ok) {
        const t = await r.text().catch(() => "");
        throw new Error(`HTTP ${r.status} ${t}`);
      }
      const { token: tokenStr, user } = await r.json();

      if (user.role !== "manager" && user.role !== "admin") {
        alert("无权限：仅经理或管理员可访问该页面");
        return;
      }
      setMe(user);
      setToken(tokenStr);
      localStorage.setItem("admintoken", tokenStr);
    } catch (err: any) {
      alert("登录失败：" + (err?.message || err));
    }
  };

  const handleLogout = () => {
    setToken("");
    setMe(null);
    localStorage.removeItem("admintoken");
  };

  // ===== 批量通过 =====
  const handleApproveCurrentUserAll = async () => {
    if (!selectedUserId) {
      alert("请先在上方列表中选择一个用户");
      return;
    }
    try {
      const res = await api.post("timesheets/bulk_approve", null, {
        params: { user_id: selectedUserId },
      });
      alert(`已通过 ${res.data.approved} 条待审核记录`);
      await fetchUsersAndCounts();
      await fetchTimesheets();
    } catch (err: any) {
      alert("一键通过失败：" + (err.response?.data?.detail || err.message));
    }
  };

  const handleApproveAllUsersAll = async () => {
    if (me?.role !== "admin") return; // 保险
    if (!confirm("确认要通过所有可见用户的全部待审核记录吗？")) return;
    try {
      const res = await api.post("timesheets/bulk_approve");
      alert(`已通过 ${res.data.approved} 条待审核记录`);
      await fetchUsersAndCounts();
      await fetchTimesheets();
    } catch (err: any) {
      alert("一键通过失败：" + (err.response?.data?.detail || err.message));
    }
  };

  // ===== 单条通过 / 驳回（单条动作：不带末尾斜杠） =====
  const handleApproveOne = async (id: number) => {
    try {
      await api.post(`timesheets/${id}/approve`);
      await fetchUsersAndCounts();
      await fetchTimesheets();
    } catch (err: any) {
      alert("通过失败：" + (err.response?.data?.detail || err.message));
    }
  };

  const handleRejectOne = async (id: number) => {
    try {
      await api.post(`timesheets/${id}/reject`);
      await fetchUsersAndCounts();
      await fetchTimesheets();
    } catch (err: any) {
      alert("驳回失败：" + (err.response?.data?.detail || err.message));
    }
  };

  // ===== 编辑（新字段） =====
  const canEditTS = (ts: Timesheet) => {
    if (ts.status !== "submitted") return false;
    if (!me) return false;
    if (me.role === "admin") return true;
    if (me.role === "manager") {
      return !allowedUserIds || allowedUserIds.has(ts.user_id);
    }
    return false;
  };

  const startEdit = (ts: Timesheet) => {
    setEditingId(ts.id);
    setEditForm({
      hours: String(ts.hours ?? ""),

      project_id: ts.project_id ? String(ts.project_id) : "",
      note: ts.note || "",

      submit_time: ts.submit_time || "",
      fill_id: ts.fill_id || "",
      answer_time: ts.answer_time || "",
      nickname: ts.nickname || "",
      weekly_summary: ts.weekly_summary || "",
      project_group_filter: ts.project_group_filter || "",
      director_filter: ts.director_filter || "",
      week_no: ts.week_no || "",
      pm_reduce_hours: ts.pm_reduce_hours || "",
      identified_by: ts.identified_by || "",
      reduce_desc: ts.reduce_desc || "",
      director_reduce_hours: ts.director_reduce_hours || "",
      group_reduce_hours: ts.group_reduce_hours || "",
      reason_desc: ts.reason_desc || "",
    });
  };

  const saveEdit = async (ts: Timesheet) => {
    try {
      const body = {
        project_id: editForm.project_id ? parseInt(editForm.project_id, 10) : null,
        hours: parseFloat(editForm.hours || "0"),

        note: editForm.note,

        submit_time: editForm.submit_time || null,
        fill_id: editForm.fill_id || null,
        answer_time: editForm.answer_time || null,
        nickname: editForm.nickname || null,
        weekly_summary: editForm.weekly_summary || null,
        project_group_filter: editForm.project_group_filter || null,
        director_filter: editForm.director_filter || null,
        week_no: editForm.week_no || null,
        pm_reduce_hours: editForm.pm_reduce_hours || null,
        identified_by: editForm.identified_by || null,
        reduce_desc: editForm.reduce_desc || null,
        director_reduce_hours: editForm.director_reduce_hours || null,
        group_reduce_hours: editForm.group_reduce_hours || null,
        reason_desc: editForm.reason_desc || null,
      };

      if (!body.hours || body.hours <= 0) {
        alert("请填写有效的工时数");
        return;
      }

      await api.put(`timesheets/${ts.id}`, body);
      setEditingId(null);
      await fetchTimesheets();
    } catch (err: any) {
      alert("保存失败：" + (err.response?.data?.detail || err.message));
    }
  };

  // ===== 用户搜索 + 只看待审核 =====
  const filteredUsers = useMemo(() => {
    const q = userQuery.trim().toLowerCase();
    return users.filter((u) => {
      if (pendingOnly && (pendingMap[u.id] || 0) === 0) return false;
      if (!q) return true;
      return (
        (u.name && u.name.toLowerCase().includes(q)) ||
        (u.mobile && u.mobile.includes(q)) ||
        String(u.id) === q
      );
    });
  }, [users, userQuery, pendingOnly, pendingMap]);

  const goto = (n: number) => {
    if (!pageData) return;
    const p = Math.min(Math.max(1, n), totalPages);
    setPage(p);
  };

  if (!token) {
    // 登录页
    return (
      <div className="max-w-md mx-auto mt-10">
        <Card>
          <CardContent className="space-y-3 p-6">
            <h2 className="text-lg font-semibold">管理员登录</h2>
            <div>
              <Label>手机号</Label>
              <Input
                value={loginForm.mobile}
                onChange={(e) => setLoginForm({ ...loginForm, mobile: e.target.value })}
              />
            </div>
            <div>
              <Label>密码</Label>
              <Input
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
              />
            </div>
            <Button type="button" onClick={handleLogin}>登录</Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-4 p-2">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-semibold">管理员工时面板</h1>
        <div className="flex gap-2 items-center">
          {me && (
            <span className="text-sm text-gray-500 mr-2">
              {me.name}（{me.role}）
            </span>
          )}
          <Link to="/admin/summary">
            <Button variant="outline">工时汇总</Button>
          </Link>
          <Button variant="outline" onClick={handleLogout}>
            退出登录
          </Button>
        </div>
      </div>

      {/* 上：用户表格（可滚动） */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <Input
              placeholder="搜索姓名/手机号/ID"
              className="max-w-xs"
              value={userQuery}
              onChange={(e) => setUserQuery(e.target.value)}
            />
            <label className="flex items-center gap-2 text-sm">
              <input
                type="checkbox"
                checked={pendingOnly}
                onChange={(e) => setPendingOnly(e.target.checked)}
              />
              只显示有待审核的用户
            </label>
            <div className="text-sm text-gray-500">共 {filteredUsers.length} 人</div>
          </div>

          <div className="border rounded">
            <div className="grid grid-cols-5 bg-gray-50 text-sm font-medium px-3 py-2 sticky top-0">
              <div>ID</div>
              <div>姓名</div>
              <div>手机号</div>
              <div>角色</div>
              <div>待审核</div>
            </div>

            <div className="max-h-64 overflow-y-auto">
              {filteredUsers.map((u) => {
                const pending = pendingMap[u.id] || 0;
                const active = u.id === selectedUserId;
                return (
                  <div
                    key={u.id}
                    className={`grid grid-cols-5 px-3 py-2 text-sm border-t cursor-pointer ${
                      active ? "bg-blue-50" : "hover:bg-gray-50"
                    }`}
                    onClick={() => {
                      setSelectedUserId(u.id);
                      setPage(1);
                    }}
                  >
                    <div>{u.id}</div>
                    <div>{u.name || `用户${u.id}`}</div>
                    <div>{u.mobile || "-"}</div>
                    <div>{u.role}</div>
                    <div>
                      {pending > 0 ? (
                        <span className="px-2 py-0.5 text-xs rounded bg-yellow-100 text-yellow-800">
                          {pending}
                        </span>
                      ) : (
                        <span className="text-gray-400">0</span>
                      )}
                    </div>
                  </div>
                );
              })}
              {filteredUsers.length === 0 && (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">无匹配用户</div>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 下：工时列表 */}
      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex items-center gap-3">
            <div className="text-sm">当前用户：{selectedUserId ?? "未选择"}</div>
            <div className="flex items-center gap-2">
              <span className="text-sm">状态：</span>
              <select
                className="border rounded px-2 py-1 text-sm"
                value={status}
                onChange={(e) => {
                  setStatus(e.target.value as any);
                  setPage(1);
                }}
              >
                <option value="">全部</option>
                <option value="submitted">待审核</option>
                <option value="approved">已通过</option>
                <option value="rejected">已驳回</option>
              </select>
            </div>

            {/* 批量通过按钮 */}
            <div className="ml-auto flex items-center gap-2">
              <Button
                variant="outline"
                size="sm"
                onClick={handleApproveCurrentUserAll}
                disabled={!selectedUserId}
                title="将当前用户的所有待审核记录设为已通过"
              >
                通过该用户全部待审
              </Button>

              {me?.role === "admin" && (
                <Button
                  size="sm"
                  onClick={handleApproveAllUsersAll}
                  title="将所有可见用户的所有待审核记录设为已通过"
                >
                  通过全员全部待审
                </Button>
              )}
            </div>
          </div>

          <div className="space-y-2">
            {!pageData && <div className="text-sm text-gray-500">请选择用户以查看工时…</div>}

            {pageData &&
              (pageData.items.length ? (
                pageData.items.map((ts) => {
                  const ui = STATUS_UI[ts.status] ?? {
                    text: ts.status,
                    cls: "bg-gray-100 text-gray-800",
                  };
                  const canAct = canEditTS(ts);
                  const isEditing = editingId === ts.id;
                  const projName =
                    (ts.project_id != null && projectNameMap.get(ts.project_id)) || "-";

                  return (
                    <div key={ts.id} className="rounded border bg-white p-3">
                      <div className="flex items-center justify-between gap-3">
                        <div className="font-medium">
                          记录 #{ts.id}（工时：{(ts.hours ?? 0).toFixed(2)}）
                          {ts.created_at && (
                            <span className="text-gray-500 text-sm ml-2">
                              创建于：{new Date(ts.created_at).toLocaleString()}
                            </span>
                          )}
                        </div>
                        <div className="flex items-center gap-2">
                          <span className={`px-2 py-0.5 rounded text-xs font-medium ${ui.cls}`}>
                            {ui.text}
                          </span>

                          {!isEditing ? (
                            <>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canAct}
                                onClick={() => handleApproveOne(ts.id)}
                                title={canAct ? "通过该条记录" : "仅待审核可操作"}
                              >
                                通过
                              </Button>
                              <Button
                                size="sm"
                                variant="destructive"
                                disabled={!canAct}
                                onClick={() => handleRejectOne(ts.id)}
                                title={canAct ? "驳回该条记录" : "仅待审核可操作"}
                              >
                                驳回
                              </Button>
                              <Button
                                size="sm"
                                variant="outline"
                                disabled={!canAct}
                                onClick={() => startEdit(ts)}
                                title={canAct ? "编辑该条记录" : "仅待审核可编辑"}
                              >
                                编辑
                              </Button>
                            </>
                          ) : (
                            <>
                              <Button size="sm" onClick={() => saveEdit(ts)}>
                                保存
                              </Button>
                              <Button size="sm" variant="outline" onClick={() => setEditingId(null)}>
                                取消
                              </Button>
                            </>
                          )}
                        </div>
                      </div>

                      {!isEditing ? (
                        <div className="text-sm text-gray-700 mt-1 space-y-1">
                          <div>项目：{projName}{ts.project_id ? `（ID:${ts.project_id}）` : ""}</div>
                          {ts.note && <div>备注：{ts.note}</div>}
                          {ts.nickname && <div>昵称：{ts.nickname}</div>}
                          {ts.weekly_summary && <div>本周完成情况：{ts.weekly_summary}</div>}
                          {(ts.pm_reduce_hours || ts.director_reduce_hours || ts.group_reduce_hours) && (
                            <div>
                              核减（PM/主任/项目群）：{ts.pm_reduce_hours || "-"} / {ts.director_reduce_hours || "-"} / {ts.group_reduce_hours || "-"}
                            </div>
                          )}
                        </div>
                      ) : (
                        <div className="grid grid-cols-2 gap-3 mt-2 text-sm">
                          {/* 基本项 */}
                          <div className="col-span-2 grid grid-cols-2 gap-3">
                            <div>
                              <Label>工时数（小时）</Label>
                              <Input
                                type="number"
                                step="0.25"
                                min="0"
                                value={editForm.hours}
                                onChange={(e) => setEditForm({ ...editForm, hours: e.target.value })}
                              />
                            </div>

                            <div>
                              <Label>项目</Label>
                              <select
                                className="w-full border rounded px-2 py-1"
                                value={editForm.project_id}
                                onChange={(e) =>
                                  setEditForm({ ...editForm, project_id: e.target.value })
                                }
                              >
                                <option value="">（不关联项目）</option>
                                {projects.map((p) => (
                                  <option key={p.id} value={String(p.id)}>
                                    {p.name}（ID:{p.id}）
                                  </option>
                                ))}
                              </select>
                            </div>

                            <div className="col-span-2">
                              <Label>备注</Label>
                              <Input
                                value={editForm.note}
                                onChange={(e) => setEditForm({ ...editForm, note: e.target.value })}
                              />
                            </div>
                          </div>

                          {/* 扩展字符串字段 */}
                          <div>
                            <Label>昵称</Label>
                            <Input
                              value={editForm.nickname}
                              onChange={(e) => setEditForm({ ...editForm, nickname: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>提交时间</Label>
                            <Input
                              value={editForm.submit_time}
                              onChange={(e) =>
                                setEditForm({ ...editForm, submit_time: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>填写ID</Label>
                            <Input
                              value={editForm.fill_id}
                              onChange={(e) => setEditForm({ ...editForm, fill_id: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>答题时间</Label>
                            <Input
                              value={editForm.answer_time}
                              onChange={(e) =>
                                setEditForm({ ...editForm, answer_time: e.target.value })
                              }
                            />
                          </div>

                          <div className="col-span-2">
                            <Label>本周完成情况说明</Label>
                            <Input
                              value={editForm.weekly_summary}
                              onChange={(e) =>
                                setEditForm({ ...editForm, weekly_summary: e.target.value })
                              }
                            />
                          </div>

                          <div>
                            <Label>项目群筛选</Label>
                            <Input
                              value={editForm.project_group_filter}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  project_group_filter: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>室主任筛选</Label>
                            <Input
                              value={editForm.director_filter}
                              onChange={(e) =>
                                setEditForm({ ...editForm, director_filter: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>周数</Label>
                            <Input
                              value={editForm.week_no}
                              onChange={(e) =>
                                setEditForm({ ...editForm, week_no: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>项目负责人核减工时数</Label>
                            <Input
                              value={editForm.pm_reduce_hours}
                              onChange={(e) =>
                                setEditForm({ ...editForm, pm_reduce_hours: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>认定人</Label>
                            <Input
                              value={editForm.identified_by}
                              onChange={(e) =>
                                setEditForm({ ...editForm, identified_by: e.target.value })
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>核减情况说明</Label>
                            <Input
                              value={editForm.reduce_desc}
                              onChange={(e) =>
                                setEditForm({ ...editForm, reduce_desc: e.target.value })
                              }
                            />
                          </div>
                          <div>
                            <Label>室主任核减工时</Label>
                            <Input
                              value={editForm.director_reduce_hours}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  director_reduce_hours: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div>
                            <Label>项目群核减工时</Label>
                            <Input
                              value={editForm.group_reduce_hours}
                              onChange={(e) =>
                                setEditForm({
                                  ...editForm,
                                  group_reduce_hours: e.target.value,
                                })
                              }
                            />
                          </div>
                          <div className="col-span-2">
                            <Label>原因情况说明</Label>
                            <Input
                              value={editForm.reason_desc}
                              onChange={(e) =>
                                setEditForm({ ...editForm, reason_desc: e.target.value })
                              }
                            />
                          </div>
                        </div>
                      )}
                    </div>
                  );
                })
              ) : (
                <div className="text-sm text-gray-500">没有记录</div>
              ))}
          </div>

          {pageData && (
            <div className="flex items-center justify-center gap-3 pt-2">
              <Button
                variant="outline"
                size="sm"
                onClick={() => goto(page - 1)}
                disabled={page <= 1}
              >
                上一页
              </Button>
              <span className="text-sm">
                第 <strong>{page}</strong> / <strong>{totalPages}</strong> 页（共 {pageData.total} 条）
              </span>
              <Button
                variant="outline"
                size="sm"
                onClick={() => goto(page + 1)}
                disabled={page >= totalPages}
              >
                下一页
              </Button>
              <div className="flex items-center gap-1">
                <span className="text-sm">跳转到</span>
                <Input
                  type="number"
                  min={1}
                  max={totalPages}
                  className="w-20"
                  value={page}
                  onChange={(e) => goto(parseInt(e.target.value || "1", 10))}
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
