import { useState, useRef, useEffect } from 'react'
import { Layout as AntLayout, Menu, Dropdown, Avatar, Space, Typography, Button, Modal, message, Spin, Tag } from 'antd'
import {
  HomeOutlined,
  FormOutlined,
  AimOutlined,
  RocketOutlined,
  EditOutlined,
  SettingOutlined,
  BarChartOutlined,
  UserOutlined,
  LogoutOutlined,
  UploadOutlined,
  FileSearchOutlined,
  CheckCircleOutlined,
  WalletOutlined,
  CrownOutlined,
} from '@ant-design/icons'
import { Outlet, useNavigate, useLocation } from 'react-router-dom'
import useAuthStore from '../store/useAuthStore'
import useBillingStore from '../store/useBillingStore'
import { uploadResume, analyzeResume } from '../api/resume'
import { getConfig } from '../api/modelConfig'
import ResumeReport from './ResumeReport'

const { Header, Content } = AntLayout
const { Text } = Typography

const navItems = [
  { key: '/', icon: <HomeOutlined />, label: '首页' },
  { key: '/assessment', icon: <FormOutlined />, label: '测评' },
  { key: '/matching', icon: <AimOutlined />, label: '匹配' },
  { key: '/career', icon: <RocketOutlined />, label: '规划' },
  { key: '/quiz', icon: <EditOutlined />, label: '刷题' },
  { key: '/usage', icon: <BarChartOutlined />, label: '统计' },
  { key: '/settings', icon: <SettingOutlined />, label: '设置' },
]

export default function Layout() {
  const navigate = useNavigate()
  const location = useLocation()
  const { user, logout } = useAuthStore()
  const { wallet, fetchWallet } = useBillingStore()
  const fileInputRef = useRef(null)

  const [resumeId, setResumeId] = useState(null)
  const [resumeFilename, setResumeFilename] = useState('')
  const [uploading, setUploading] = useState(false)
  const [analyzing, setAnalyzing] = useState(false)
  const [analysis, setAnalysis] = useState(null)
  const [showReport, setShowReport] = useState(false)
  const [isPlatformMode, setIsPlatformMode] = useState(false)

  const token = useAuthStore((s) => s.token)

  useEffect(() => {
    const loadMode = async () => {
      try {
        const res = await getConfig()
        const mode = res.data.mode || 'platform'
        setIsPlatformMode(mode === 'platform')
        if (mode === 'platform') {
          fetchWallet()
        }
      } catch {}
    }
    if (user) loadMode()
  }, [user])

  const handleLogout = () => {
    logout()
    navigate('/login')
  }

  const userMenuItems = [
    {
      key: 'logout',
      icon: <LogoutOutlined />,
      label: '退出登录',
      onClick: handleLogout,
    },
  ]

  const handleUploadClick = () => {
    fileInputRef.current?.click()
  }

  const handleFileChange = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    e.target.value = ''

    setUploading(true)
    try {
      const res = await uploadResume(file)
      setResumeId(res.data.resume_id)
      setResumeFilename(res.data.filename)
      setAnalysis(null)
      message.success(`简历「${res.data.filename}」上传成功`)
    } catch (err) {
      message.error(err.response?.data?.detail || '上传失败')
    } finally {
      setUploading(false)
    }
  }

  const handleAnalyze = async () => {
    if (!resumeId) return
    setAnalyzing(true)
    try {
      const res = await analyzeResume(resumeId)
      setAnalysis(res.data.analysis)
      setShowReport(true)
    } catch (err) {
      message.error(err.response?.data?.detail || '分析失败')
    } finally {
      setAnalyzing(false)
    }
  }

  return (
    <AntLayout className="min-h-screen">
      <Header className="flex items-center justify-between px-6" style={{ background: '#fff', borderBottom: '1px solid #f0f0f0' }}>
        <div className="flex items-center gap-8">
          <div
            className="text-lg font-bold cursor-pointer"
            style={{ color: '#1677ff' }}
            onClick={() => navigate('/')}
          >
            AI Recruit Agent
          </div>
          <Menu
            mode="horizontal"
            selectedKeys={[location.pathname]}
            items={navItems}
            onClick={({ key }) => navigate(key)}
            style={{ border: 'none', flex: 1 }}
          />
        </div>
        <Space size="middle">
          {token ? (
            <>
              {isPlatformMode && wallet && (
                <Tag
                  icon={wallet.subscription_active ? <CrownOutlined /> : <WalletOutlined />}
                  color={wallet.subscription_active ? 'gold' : 'blue'}
                  style={{ cursor: 'pointer', fontSize: 13, padding: '2px 10px' }}
                  onClick={() => navigate('/settings')}
                >
                  {wallet.subscription_active
                    ? (wallet.subscription_plan === 'weekly' ? '周卡' : '月卡')
                    : `${wallet.balance} 积分`}
                </Tag>
              )}
              <input
                ref={fileInputRef}
                type="file"
                accept=".pdf,.docx,.txt"
                style={{ display: 'none' }}
                onChange={handleFileChange}
              />
              <Button
                icon={resumeId ? <CheckCircleOutlined /> : <UploadOutlined />}
                onClick={handleUploadClick}
                loading={uploading}
                type={resumeId ? 'default' : 'default'}
                style={resumeId ? { color: '#52c41a', borderColor: '#52c41a' } : {}}
              >
                {resumeId ? '重新导入' : '导入简历'}
              </Button>
              {resumeId && (
                <Button
                  icon={<FileSearchOutlined />}
                  onClick={analysis ? () => setShowReport(true) : handleAnalyze}
                  loading={analyzing}
                  type="primary"
                  ghost
                >
                  简历分析
                </Button>
              )}
              <Dropdown menu={{ items: userMenuItems }} placement="bottomRight">
                <Space className="cursor-pointer">
                  <Avatar icon={<UserOutlined />} style={{ backgroundColor: '#1677ff' }} />
                  <Text>{user?.name}</Text>
                </Space>
              </Dropdown>
            </>
          ) : (
            <>
              <Button type="primary" onClick={() => navigate('/login')}>登录</Button>
              <Button onClick={() => navigate('/register')}>注册</Button>
            </>
          )}
        </Space>
      </Header>
      <Content className="p-6" style={{ background: '#f5f5f5', minHeight: 'calc(100vh - 64px)' }}>
        <Outlet />
      </Content>

      <Modal
        title={null}
        open={showReport}
        onCancel={() => setShowReport(false)}
        footer={<Button type="primary" onClick={() => setShowReport(false)}>关闭</Button>}
        width={640}
      >
        {analyzing ? (
          <div className="flex flex-col items-center justify-center py-10">
            <Spin size="large" />
            <Text type="secondary" className="mt-4">AI 正在分析你的简历...</Text>
          </div>
        ) : (
          <ResumeReport analysis={analysis} filename={resumeFilename} />
        )}
      </Modal>
    </AntLayout>
  )
}
