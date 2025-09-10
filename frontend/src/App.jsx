import React from "react";
import { BrowserRouter, Routes, Route, Link } from "react-router-dom";
import TimesheetPage from "./pages/TimesheetPage";
import AdminTimesheetsPage from "./pages/AdminTimesheetsPage";
import AdminSummaryPage from "./pages/AdminSummaryPage";
import AdminPendingWeChatPage from "./pages/AdminPendingWeChatPage"; // ← 新页面

export default function App() {
  return (
    <BrowserRouter>
      <div className="min-h-screen bg-gray-100 p-4 space-y-4">
        <nav className="flex gap-4">
          <Link to="/" className="text-blue-600 hover:underline">用户工时</Link>
          <Link to="/admin" className="text-blue-600 hover:underline">管理员</Link>
          <Link to="/admin/summary" className="text-blue-600 hover:underline">工时汇总</Link>
          <Link to="/admin/pending" className="text-blue-600 hover:underline">微信待审批</Link> {/* 新入口 */}
        </nav>
        <Routes>
          <Route path="/" element={<TimesheetPage />} />
          <Route path="/admin" element={<AdminTimesheetsPage />} />
          <Route path="/admin/summary" element={<AdminSummaryPage />} /> 
          <Route path="/admin/pending" element={<AdminPendingWeChatPage />} /> {/* 新页面 */}
        </Routes>
      </div>
    </BrowserRouter>
  );
}
