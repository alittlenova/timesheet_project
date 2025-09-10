import { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Link } from "react-router-dom";

type Row = {
  user_id: number;
  name?: string | null;
  total_hours: number;
};

//const api = axios.create({ baseURL: "http://localhost:8000" });
const api = axios.create({ baseURL: "http://49.235.107.96:8000" });

export default function AdminSummaryPage() {
  const [token, setToken] = useState("");
  const [fromDate, setFromDate] = useState<string>("");
  const [toDate, setToDate] = useState<string>("");
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);
  const [hint, setHint] = useState<string>("");

  // 读取本地 token（与 /admin 共用）并设置默认日期（本月）
  useEffect(() => {
    const t = localStorage.getItem("admintoken") || "";
    if (t) {
      setToken(t);
      api.defaults.headers.common["Authorization"] = `Bearer ${t}`;
    }
    const today = new Date();
    const y = today.getFullYear();
    const m = today.getMonth();
    const pad = (n: number) => String(n).padStart(2, "0");
    setFromDate(`${y}-${pad(m + 1)}-01`);
    setToDate(`${y}-${pad(m + 1)}-${pad(today.getDate())}`);
  }, []);

  // 查询（带回退机制）
  const fetchRows = async () => {
    if (!token) {
      alert("请先登录管理员");
      return;
    }
    setHint("");
    setLoading(true);
    try {
      // 先尝试带 from/to
      const res = await api.get<Row[]>("/reports/approved_hours", {
        params: {
          // 如果你的后端尚未适配新结构，可能这里会 500；回退逻辑会处理
          from: fromDate || undefined,
          to: toDate || undefined,
        },
      });
      setRows((res.data || []).filter((r) => (r.total_hours ?? 0) >= 0));
    } catch (err: any) {
      const code = err?.response?.status;
      // 401：登录失效
      if (code === 401) {
        alert("登录已过期，请返回管理员页重新登录");
        localStorage.removeItem("admintoken");
        setToken("");
        delete api.defaults.headers.common["Authorization"];
        setLoading(false);
        return;
      }
      // 其它异常：回退为不带日期参数的查询（多数是后端仍使用旧字段过滤导致）
      try {
        const res2 = await api.get<Row[]>("/reports/approved_hours");
        setRows((res2.data || []).filter((r) => (r.total_hours ?? 0) >= 0));
        setHint("日期过滤暂不可用，已自动回退为全部时间范围。请升级后端汇总接口以支持新结构。");
      } catch (err2: any) {
        alert(
          "拉取汇总失败：" +
            (err2?.response?.data?.detail || err2?.message || "未知错误")
        );
      }
    } finally {
      setLoading(false);
    }
  };

  // 合计
  const grandTotal = useMemo(
    () => rows.reduce((s, r) => s + (r.total_hours || 0), 0),
    [rows]
  );

  if (!token) {
    return (
      <div className="max-w-xl mx-auto mt-10">
        <Card>
          <CardContent className="p-6 space-y-3">
            <div className="font-semibold">未登录</div>
            <p className="text-sm text-gray-600">
              请先到管理员页登录，然后再返回本页。
            </p>
            <Link to="/admin">
              <Button>去管理员页</Button>
            </Link>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto p-3 space-y-4">
      <div className="flex items-center justify-between">
        <h1 className="text-lg font-semibold">已审核总工时汇总</h1>
        <Link to="/admin">
          <Button variant="outline">返回管理员页</Button>
        </Link>
      </div>

      <Card>
        <CardContent className="p-4 space-y-3">
          <div className="flex flex-wrap items-end gap-3">
            <div>
              <div className="text-sm mb-1">起始日期</div>
              <Input
                type="date"
                value={fromDate}
                onChange={(e) => setFromDate(e.target.value)}
              />
            </div>
            <div>
              <div className="text-sm mb-1">终止日期</div>
              <Input
                type="date"
                value={toDate}
                onChange={(e) => setToDate(e.target.value)}
              />
            </div>
            <Button onClick={fetchRows} disabled={loading}>
              {loading ? "加载中…" : "查询"}
            </Button>
          </div>

          {hint && (
            <div className="text-xs text-yellow-700 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
              {hint}
            </div>
          )}

          <div className="border rounded">
            <div className="grid grid-cols-3 bg-gray-50 px-3 py-2 text-sm font-medium">
              <div>用户ID</div>
              <div>姓名</div>
              <div className="text-right">已审核总工时</div>
            </div>
            <div className="max-h-[480px] overflow-y-auto divide-y">
              {rows.length ? (
                rows.map((r) => (
                  <div key={r.user_id} className="grid grid-cols-3 px-3 py-2 text-sm">
                    <div>{r.user_id}</div>
                    <div>{r.name || `用户${r.user_id}`}</div>
                    <div className="text-right">
                      {(r.total_hours || 0).toFixed(2)}
                    </div>
                  </div>
                ))
              ) : (
                <div className="px-3 py-6 text-sm text-gray-500 text-center">
                  暂无数据
                </div>
              )}
            </div>
            <div className="flex items-center justify-between px-3 py-2 text-sm bg-gray-50">
              <div>合计</div>
              <div />
              <div className="text-right font-medium">
                {grandTotal.toFixed(2)}
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
