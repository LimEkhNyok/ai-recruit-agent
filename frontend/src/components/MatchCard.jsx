import { useState } from 'react'
import { Card, Progress, Tag, Button, Typography } from 'antd'
import { ThunderboltOutlined, AudioOutlined, DownOutlined, UpOutlined } from '@ant-design/icons'

const { Text, Paragraph } = Typography

const dimensionLabels = {
  personality_fit: '性格匹配',
  ability_fit: '能力匹配',
  interest_fit: '兴趣匹配',
  value_fit: '价值观匹配',
}

export default function MatchCard({ match, onInterview }) {
  const [expanded, setExpanded] = useState(false)

  const scoreColor =
    match.score >= 80 ? '#52c41a' : match.score >= 60 ? '#1677ff' : '#faad14'

  return (
    <Card
      className="h-full"
      style={match.is_beyond_cognition ? { border: '2px solid #722ed1' } : {}}
    >
      <div className="flex items-start justify-between mb-3">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <Text strong style={{ fontSize: 16 }}>{match.job_title}</Text>
            {match.is_beyond_cognition && (
              <Tag icon={<ThunderboltOutlined />} color="purple">突破认知</Tag>
            )}
          </div>
          <Tag>{match.job_category}</Tag>
        </div>
        <Progress
          type="circle"
          percent={match.score}
          size={56}
          strokeColor={scoreColor}
          format={(p) => <span style={{ fontSize: 14, fontWeight: 600 }}>{p}</span>}
        />
      </div>

      <Paragraph
        type="secondary"
        ellipsis={expanded ? false : { rows: 2 }}
        style={{ fontSize: 13, marginBottom: 8 }}
      >
        {match.reason}
      </Paragraph>

      {expanded && match.breakdown && (
        <div className="mb-3 p-3 rounded-lg" style={{ background: '#fafafa' }}>
          {Object.entries(match.breakdown).map(([key, val]) => (
            <div key={key} className="flex items-center justify-between mb-1">
              <Text style={{ fontSize: 13 }}>{dimensionLabels[key] || key}</Text>
              <div className="flex items-center gap-2">
                <div className="w-24 h-2 rounded-full overflow-hidden" style={{ background: '#f0f0f0' }}>
                  <div
                    className="h-full rounded-full"
                    style={{ width: `${val}%`, background: '#1677ff' }}
                  />
                </div>
                <Text strong style={{ fontSize: 12, width: 24 }}>{val}</Text>
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="flex items-center justify-between mt-2">
        <Button
          type="link"
          size="small"
          icon={expanded ? <UpOutlined /> : <DownOutlined />}
          onClick={() => setExpanded(!expanded)}
          style={{ padding: 0 }}
        >
          {expanded ? '收起' : '详细分析'}
        </Button>
        <Button
          type="primary"
          icon={<AudioOutlined />}
          onClick={() => onInterview(match.job_id)}
        >
          模拟面试
        </Button>
      </div>
    </Card>
  )
}
