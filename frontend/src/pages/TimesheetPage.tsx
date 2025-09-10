import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import axios from 'axios'

// ✅ 每页条数
const PAGE_SIZE = 4

const STATUS_UI: Record<string, { text: string; cls: string }> = {
  submitted: { text: '待审核', cls: 'bg-yellow-100 text-yellow-800' },
  approved:  { text: '已通过', cls: 'bg-green-100 text-green-800' },
  rejected:  { text: '已驳回', cls: 'bg-red-100 text-red-800' },
}

type Project = { id: number; name: string }

// 与后端一致的新 Timesheet 结构（核心是 hours + 一堆字符串；无日期/起止时间）
type Timesheet = {
  id: number
  user_id: number
  project_id: number | null
  hours: number
  // 你新增的字符串字段（都可为空）
  submit_time?: string | null
  fill_id?: string | null
  answer_time?: string | null
  nickname?: string | null
  weekly_summary?: string | null
  project_group_filter?: string | null
  director_filter?: string | null
  week_no?: string | null
  pm_reduce_hours?: string | null
  identified_by?: string | null
  reduce_desc?: string | null
  director_reduce_hours?: string | null
  group_reduce_hours?: string | null
  reason_desc?: string | null

  overtime?: boolean
  note?: string | null
  status: 'submitted' | 'approved' | 'rejected'

  created_at?: string
  updated_at?: string
}

type PageData = {
  items: Timesheet[]
  page: number
  size: number
  total: number
}

// 所有请求打到 FastAPI:8000
const api = axios.create({ baseURL: 'http://localhost:8000' })

export default function TimesheetPage() {
  const [token, setToken] = useState('')
  const [timesheets, setTimesheets] = useState<Timesheet[]>([])
  const [total, setTotal] = useState(0)
  const [page, setPage] = useState(1)

  // 项目列表
  const [projects, setProjects] = useState<Project[]>([])
  const projectName = (id?: number | null) => {
    if (!id) return ''
    return projects.find(p => p.id === id)?.name ?? String(id)
  }

  // 登录表单
  const [mobile, setMobile] = useState('')
  const [password, setPassword] = useState('')

  // 新建表单（hours 必填；其余可空）
  const [form, setForm] = useState({
    hours: '',
    project_id: '',
    note: '',

    submit_time: '',
    fill_id: '',
    answer_time: '',
    nickname: '',
    weekly_summary: '',
    project_group_filter: '',
    director_filter: '',
    week_no: '',
    pm_reduce_hours: '',
    identified_by: '',
    reduce_desc: '',
    director_reduce_hours: '',
    group_reduce_hours: '',
    reason_desc: '',
  })

  // 编辑状态
  const [editId, setEditId] = useState<number | null>(null)
  const [editForm, setEditForm] = useState({
    hours: '',
    project_id: '',
    note: '',

    submit_time: '',
    fill_id: '',
    answer_time: '',
    nickname: '',
    weekly_summary: '',
    project_group_filter: '',
    director_filter: '',
    week_no: '',
    pm_reduce_hours: '',
    identified_by: '',
    reduce_desc: '',
    director_reduce_hours: '',
    group_reduce_hours: '',
    reason_desc: '',
  })

  // token 变化时设置/移除 Authorization，并刷新数据
  useEffect(() => {
    if (token) {
      api.defaults.headers.common['Authorization'] = `Bearer ${token}`
      Promise.all([fetchTimesheets(1), fetchProjects()]).catch(() => {})
    } else {
      delete api.defaults.headers.common['Authorization']
      setTimesheets([])
      setTotal(0)
      setPage(1)
      setProjects([])
    }
  }, [token])

  // 拉项目
  const fetchProjects = async () => {
    try {
      const res = await api.get('/projects')
      const list: Project[] = (res.data || []).map((p: any) => ({ id: p.id, name: p.name }))
      setProjects(list)
    } catch (err: any) {
      alert('拉取项目列表失败：' + (err.response?.data?.detail || err.message))
    }
  }

  // 拉一页工时（服务端分页）
  const fetchTimesheets = async (p: number = page) => {
    const res = await api.get<PageData>('/timesheets', { params: { page: p, size: PAGE_SIZE } })
    setTimesheets(res.data.items || [])
    setTotal(res.data.total ?? 0)
    setPage(res.data.page ?? p)
  }

  // 新增（仅 hours 必填、>0；project 可空）
  const handleSubmit = async () => {
    const hoursNum = parseFloat(form.hours || '0')
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      alert('请填写有效的工时（大于 0）')
      return
    }

    const pid = form.project_id ? parseInt(form.project_id, 10) : undefined
    if (form.project_id && !projects.some(p => p.id === pid)) {
      alert('项目无效')
      return
    }

    try {
      const body = {
        hours: hoursNum,
        project_id: pid ?? null,
        note: form.note?.trim() || '',

        submit_time: form.submit_time || '',
        fill_id: form.fill_id || '',
        answer_time: form.answer_time || '',
        nickname: form.nickname || '',
        weekly_summary: form.weekly_summary || '',
        project_group_filter: form.project_group_filter || '',
        director_filter: form.director_filter || '',
        week_no: form.week_no || '',
        pm_reduce_hours: form.pm_reduce_hours || '',
        identified_by: form.identified_by || '',
        reduce_desc: form.reduce_desc || '',
        director_reduce_hours: form.director_reduce_hours || '',
        group_reduce_hours: form.group_reduce_hours || '',
        reason_desc: form.reason_desc || '',
      }
      await api.post('/timesheets', body)
      // 重置但保留登录框
      setForm({
        hours: '',
        project_id: '',
        note: '',

        submit_time: '',
        fill_id: '',
        answer_time: '',
        nickname: '',
        weekly_summary: '',
        project_group_filter: '',
        director_filter: '',
        week_no: '',
        pm_reduce_hours: '',
        identified_by: '',
        reduce_desc: '',
        director_reduce_hours: '',
        group_reduce_hours: '',
        reason_desc: '',
      })
      fetchTimesheets(1)
    } catch (err: any) {
      alert('提交失败：' + (err.response?.data?.detail || err.message))
    }
  }

  // 开始编辑（仅 submitted 可编辑）
  const startEdit = (ts: Timesheet) => {
    if (ts.status !== 'submitted') return
    setEditId(ts.id)
    setEditForm({
      hours: String(ts.hours ?? ''),
      project_id: ts.project_id ? String(ts.project_id) : '',
      note: ts.note ?? '',

      submit_time: ts.submit_time ?? '',
      fill_id: ts.fill_id ?? '',
      answer_time: ts.answer_time ?? '',
      nickname: ts.nickname ?? '',
      weekly_summary: ts.weekly_summary ?? '',
      project_group_filter: ts.project_group_filter ?? '',
      director_filter: ts.director_filter ?? '',
      week_no: ts.week_no ?? '',
      pm_reduce_hours: ts.pm_reduce_hours ?? '',
      identified_by: ts.identified_by ?? '',
      reduce_desc: ts.reduce_desc ?? '',
      director_reduce_hours: ts.director_reduce_hours ?? '',
      group_reduce_hours: ts.group_reduce_hours ?? '',
      reason_desc: ts.reason_desc ?? '',
    })
  }

  // 保存编辑
  const handleUpdate = async (tsId: number) => {
    const hoursNum = parseFloat(editForm.hours || '0')
    if (!Number.isFinite(hoursNum) || hoursNum <= 0) {
      alert('请填写有效的工时（大于 0）')
      return
    }
    const pid = editForm.project_id ? parseInt(editForm.project_id, 10) : undefined
    if (editForm.project_id && !projects.some(p => p.id === pid)) {
      alert('项目无效')
      return
    }

    try {
      const body = {
        hours: hoursNum,
        project_id: pid ?? null,
        note: editForm.note?.trim() || '',

        submit_time: editForm.submit_time || '',
        fill_id: editForm.fill_id || '',
        answer_time: editForm.answer_time || '',
        nickname: editForm.nickname || '',
        weekly_summary: editForm.weekly_summary || '',
        project_group_filter: editForm.project_group_filter || '',
        director_filter: editForm.director_filter || '',
        week_no: editForm.week_no || '',
        pm_reduce_hours: editForm.pm_reduce_hours || '',
        identified_by: editForm.identified_by || '',
        reduce_desc: editForm.reduce_desc || '',
        director_reduce_hours: editForm.director_reduce_hours || '',
        group_reduce_hours: editForm.group_reduce_hours || '',
        reason_desc: editForm.reason_desc || '',
      }
      await api.put(`/timesheets/${tsId}`, body)
      setEditId(null)
      fetchTimesheets(1)
    } catch (err: any) {
      alert('保存失败：' + (err.response?.data?.detail || err.message))
    }
  }

  // 登录 / 退出
  const handleLogin = async () => {
    try {
      const res = await api.post('/auth/login', { mobile, password })
      setToken(res.data.token)
    } catch (err: any) {
      alert('登录失败：' + (err.response?.data?.detail || err.message))
    }
  }
  const handleLogout = () => setToken('')

  // 分页
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE))
  const goTo = (n: number) => {
    const next = Math.min(Math.max(1, n), totalPages)
    fetchTimesheets(next)
  }

  const submitDisabled = !form.hours || Number(form.hours) <= 0

  return (
    <div className="p-4 max-w-3xl mx-auto space-y-6">
      {!token ? (
        <Card>
          <CardContent className="space-y-2 p-4">
            <Label>手机号</Label>
            <Input
              id="mobile"
              value={mobile}
              onChange={e => setMobile(e.target.value)}
            />
            <Label>密码</Label>
            <Input
              type="password"
              id="password"
              value={password}
              onChange={e => setPassword(e.target.value)}
            />
            <Button onClick={handleLogin}>登录</Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="flex justify-end">
            <Button variant="outline" onClick={handleLogout}>退出登录</Button>
          </div>

          {/* 新建 */}
          <Card>
            <CardContent className="space-y-3 p-4">
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <Label>工时（小时）</Label>
                  <Input
                    type="number"
                    step="0.25"
                    min="0"
                    value={form.hours}
                    onChange={e => setForm({ ...form, hours: e.target.value })}
                  />
                </div>
                <div>
                  <Label>项目（可不选）</Label>
                  <select
                    className="w-full border rounded px-3 py-2"
                    value={form.project_id}
                    onChange={e => setForm({ ...form, project_id: e.target.value })}
                  >
                    <option value="">不关联项目</option>
                    {projects.map(p => (
                      <option key={p.id} value={String(p.id)}>
                        {p.id} {p.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <Label>备注</Label>
              <Textarea
                value={form.note}
                onChange={e => setForm({ ...form, note: e.target.value })}
              />

              {/* 你新增的字符串字段（示例全部放出；可按需删减/分组） */}
              <div className="grid grid-cols-2 gap-3">
                <div><Label>提交时间</Label><Input value={form.submit_time} onChange={e=>setForm({...form, submit_time: e.target.value})} /></div>
                <div><Label>填写ID</Label><Input value={form.fill_id} onChange={e=>setForm({...form, fill_id: e.target.value})} /></div>
                <div><Label>答题时间</Label><Input value={form.answer_time} onChange={e=>setForm({...form, answer_time: e.target.value})} /></div>
                <div><Label>昵称</Label><Input value={form.nickname} onChange={e=>setForm({...form, nickname: e.target.value})} /></div>
                <div className="col-span-2"><Label>本周完成情况说明</Label><Textarea value={form.weekly_summary} onChange={e=>setForm({...form, weekly_summary: e.target.value})} /></div>
                <div><Label>项目群筛选</Label><Input value={form.project_group_filter} onChange={e=>setForm({...form, project_group_filter: e.target.value})} /></div>
                <div><Label>室主任筛选</Label><Input value={form.director_filter} onChange={e=>setForm({...form, director_filter: e.target.value})} /></div>
                <div><Label>周数</Label><Input value={form.week_no} onChange={e=>setForm({...form, week_no: e.target.value})} /></div>
                <div><Label>项目负责人核减工时数</Label><Input value={form.pm_reduce_hours} onChange={e=>setForm({...form, pm_reduce_hours: e.target.value})} /></div>
                <div><Label>认定人</Label><Input value={form.identified_by} onChange={e=>setForm({...form, identified_by: e.target.value})} /></div>
                <div className="col-span-2"><Label>核减情况说明</Label><Textarea value={form.reduce_desc} onChange={e=>setForm({...form, reduce_desc: e.target.value})} /></div>
                <div><Label>室主任核减工时</Label><Input value={form.director_reduce_hours} onChange={e=>setForm({...form, director_reduce_hours: e.target.value})} /></div>
                <div><Label>项目群核减工时</Label><Input value={form.group_reduce_hours} onChange={e=>setForm({...form, group_reduce_hours: e.target.value})} /></div>
                <div className="col-span-2"><Label>原因情况说明</Label><Textarea value={form.reason_desc} onChange={e=>setForm({...form, reason_desc: e.target.value})} /></div>
              </div>

              <Button onClick={handleSubmit} disabled={submitDisabled}>
                提交工时
              </Button>
            </CardContent>
          </Card>

          {/* 列表 */}
          <div className="space-y-2">
            {timesheets.map((ts) => {
              const ui = STATUS_UI[ts.status] ?? { text: ts.status, cls: 'bg-gray-100 text-gray-800' }
              const isEditing = editId === ts.id
              const canEdit = ts.status === 'submitted' // 仅待审核可编辑

              return (
                <Card key={ts.id}>
                  <CardContent className="p-4 space-y-2">
                    <div className="flex items-center justify-between">
                      <div className="font-medium">
                        记录 #{ts.id}
                      </div>
                      <span className={`px-2 py-0.5 rounded text-xs font-medium ${ui.cls}`}>{ui.text}</span>
                    </div>

                    {!isEditing ? (
                      <>
                        <p>工时：{(ts.hours ?? 0).toFixed(2)} 小时</p>
                        <p>项目：{ts.project_id ? `${ts.project_id} ${projectName(ts.project_id)}` : '（未关联）'}</p>
                        {ts.note ? <p>备注：{ts.note}</p> : null}

                        {/* 可按需展示更多字段 */}
                        {ts.week_no ? <p>周数：{ts.week_no}</p> : null}
                        {ts.weekly_summary ? <p>本周完成：{ts.weekly_summary}</p> : null}

                        {canEdit && (
                          <div className="pt-1">
                            <Button size="sm" onClick={() => startEdit(ts)}>编辑</Button>
                          </div>
                        )}
                      </>
                    ) : (
                      <div className="space-y-3">
                        <div className="grid grid-cols-2 gap-3">
                          <div>
                            <Label>工时（小时）</Label>
                            <Input
                              type="number"
                              step="0.25"
                              min="0"
                              value={editForm.hours}
                              onChange={e => setEditForm({ ...editForm, hours: e.target.value })}
                            />
                          </div>
                          <div>
                            <Label>项目（可不选）</Label>
                            <select
                              className="w-full border rounded px-3 py-2"
                              value={editForm.project_id}
                              onChange={e => setEditForm({ ...editForm, project_id: e.target.value })}
                            >
                              <option value="">不关联项目</option>
                              {projects.map(p => (
                                <option key={p.id} value={String(p.id)}>
                                  {p.id} {p.name}
                                </option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <Label>备注</Label>
                          <Textarea
                            value={editForm.note}
                            onChange={e => setEditForm({ ...editForm, note: e.target.value })}
                          />
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                          <div><Label>提交时间</Label><Input value={editForm.submit_time} onChange={e=>setEditForm({...editForm, submit_time: e.target.value})} /></div>
                          <div><Label>填写ID</Label><Input value={editForm.fill_id} onChange={e=>setEditForm({...editForm, fill_id: e.target.value})} /></div>
                          <div><Label>答题时间</Label><Input value={editForm.answer_time} onChange={e=>setEditForm({...editForm, answer_time: e.target.value})} /></div>
                          <div><Label>昵称</Label><Input value={editForm.nickname} onChange={e=>setEditForm({...editForm, nickname: e.target.value})} /></div>
                          <div className="col-span-2"><Label>本周完成情况说明</Label><Textarea value={editForm.weekly_summary} onChange={e=>setEditForm({...editForm, weekly_summary: e.target.value})} /></div>
                          <div><Label>项目群筛选</Label><Input value={editForm.project_group_filter} onChange={e=>setEditForm({...editForm, project_group_filter: e.target.value})} /></div>
                          <div><Label>室主任筛选</Label><Input value={editForm.director_filter} onChange={e=>setEditForm({...editForm, director_filter: e.target.value})} /></div>
                          <div><Label>周数</Label><Input value={editForm.week_no} onChange={e=>setEditForm({...editForm, week_no: e.target.value})} /></div>
                          <div><Label>项目负责人核减工时数</Label><Input value={editForm.pm_reduce_hours} onChange={e=>setEditForm({...editForm, pm_reduce_hours: e.target.value})} /></div>
                          <div><Label>认定人</Label><Input value={editForm.identified_by} onChange={e=>setEditForm({...editForm, identified_by: e.target.value})} /></div>
                          <div className="col-span-2"><Label>核减情况说明</Label><Textarea value={editForm.reduce_desc} onChange={e=>setEditForm({...editForm, reduce_desc: e.target.value})} /></div>
                          <div><Label>室主任核减工时</Label><Input value={editForm.director_reduce_hours} onChange={e=>setEditForm({...editForm, director_reduce_hours: e.target.value})} /></div>
                          <div><Label>项目群核减工时</Label><Input value={editForm.group_reduce_hours} onChange={e=>setEditForm({...editForm, group_reduce_hours: e.target.value})} /></div>
                          <div className="col-span-2"><Label>原因情况说明</Label><Textarea value={editForm.reason_desc} onChange={e=>setEditForm({...editForm, reason_desc: e.target.value})} /></div>
                        </div>

                        <div className="flex gap-2">
                          <Button size="sm" onClick={() => handleUpdate(ts.id)} disabled={!editForm.hours || Number(editForm.hours) <= 0}>
                            保存
                          </Button>
                          <Button size="sm" variant="outline" onClick={() => setEditId(null)}>取消</Button>
                        </div>
                      </div>
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>

          {/* 分页控件（服务端分页） */}
          <div className="flex items-center justify-center gap-3 pt-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(page - 1)}
              disabled={page <= 1}
            >
              上一页
            </Button>

            <span className="text-sm">
              第 <strong>{page}</strong> / <strong>{Math.max(1, Math.ceil(total / PAGE_SIZE))}</strong> 页
            </span>

            <Button
              variant="outline"
              size="sm"
              onClick={() => goTo(page + 1)}
              disabled={page >= Math.max(1, Math.ceil(total / PAGE_SIZE))}
            >
              下一页
            </Button>

            <div className="flex items-center gap-1">
              <span className="text-sm">跳转到</span>
              <Input
                type="number"
                min={1}
                max={Math.max(1, Math.ceil(total / PAGE_SIZE))}
                className="w-20"
                value={page}
                onChange={(e) => {
                  const v = parseInt(e.target.value || '1', 10)
                  if (!Number.isNaN(v)) goTo(v)
                }}
              />
            </div>
          </div>
        </>
      )}
    </div>
  )
}
