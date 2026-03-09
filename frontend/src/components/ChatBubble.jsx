import { Avatar } from 'antd'
import { UserOutlined, RobotOutlined } from '@ant-design/icons'

export default function ChatBubble({ role, content }) {
  const isAI = role === 'ai'

  return (
    <div className={`flex gap-3 mb-4 ${isAI ? '' : 'flex-row-reverse'}`}>
      <Avatar
        icon={isAI ? <RobotOutlined /> : <UserOutlined />}
        style={{ backgroundColor: isAI ? '#1677ff' : '#52c41a', flexShrink: 0 }}
      />
      <div
        className="max-w-[75%] px-4 py-3 rounded-2xl text-sm leading-relaxed whitespace-pre-wrap"
        style={{
          background: isAI ? '#f0f5ff' : '#f6ffed',
          borderTopLeftRadius: isAI ? 4 : 16,
          borderTopRightRadius: isAI ? 16 : 4,
        }}
      >
        {content}
      </div>
    </div>
  )
}
