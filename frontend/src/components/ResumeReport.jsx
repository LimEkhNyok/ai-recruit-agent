import { Typography, Progress, Tag, Card, Descriptions } from 'antd'

const { Title, Text, Paragraph } = Typography

export default function ResumeReport({ analysis, filename }) {
  if (!analysis) return null

  const { basic_info, strengths, weaknesses, suggestions, suitable_directions, overall_score, overall_comment } = analysis

  const scoreColor = overall_score >= 80 ? '#52c41a' : overall_score >= 60 ? '#1677ff' : '#faad14'

  return (
    <div>
      <div className="text-center mb-4">
        <Title level={4} style={{ margin: 0 }}>简历分析报告</Title>
        <Text type="secondary">{filename}</Text>
        <div className="mt-3">
          <Progress
            type="circle"
            percent={overall_score}
            size={90}
            strokeColor={scoreColor}
            format={(p) => <span style={{ fontSize: 18, fontWeight: 600 }}>{p}</span>}
          />
          <div className="mt-1">
            <Text type="secondary">综合评分</Text>
          </div>
        </div>
      </div>

      {basic_info && (
        <Card size="small" title="基本信息" className="mb-3">
          <Descriptions column={2} size="small">
            {basic_info.name && <Descriptions.Item label="姓名">{basic_info.name}</Descriptions.Item>}
            {basic_info.education && <Descriptions.Item label="学历">{basic_info.education}</Descriptions.Item>}
            {basic_info.work_years && <Descriptions.Item label="工作年限">{basic_info.work_years}</Descriptions.Item>}
            {basic_info.current_role && <Descriptions.Item label="当前职位">{basic_info.current_role}</Descriptions.Item>}
          </Descriptions>
          {basic_info.skills && basic_info.skills.length > 0 && (
            <div className="mt-2">
              <Text strong style={{ fontSize: 13 }}>技能：</Text>
              <div className="flex flex-wrap gap-1 mt-1">
                {basic_info.skills.map((s, i) => <Tag key={i} color="blue">{s}</Tag>)}
              </div>
            </div>
          )}
        </Card>
      )}

      <Card size="small" title="亮点优势" className="mb-3">
        <ul className="m-0 pl-4">
          {(strengths || []).map((s, i) => (
            <li key={i} className="mb-1" style={{ color: '#389e0d' }}><Text>{s}</Text></li>
          ))}
        </ul>
      </Card>

      <Card size="small" title="不足之处" className="mb-3">
        <ul className="m-0 pl-4">
          {(weaknesses || []).map((s, i) => (
            <li key={i} className="mb-1" style={{ color: '#d48806' }}><Text>{s}</Text></li>
          ))}
        </ul>
      </Card>

      {suggestions && suggestions.length > 0 && (
        <Card size="small" title="改进建议" className="mb-3">
          <ol className="m-0 pl-4">
            {suggestions.map((s, i) => <li key={i} className="mb-1">{s}</li>)}
          </ol>
        </Card>
      )}

      {suitable_directions && suitable_directions.length > 0 && (
        <div className="mb-3">
          <Text strong>适合方向：</Text>
          <div className="flex flex-wrap gap-1 mt-1">
            {suitable_directions.map((d, i) => <Tag key={i} color="purple">{d}</Tag>)}
          </div>
        </div>
      )}

      {overall_comment && (
        <Card size="small" title="总体评价">
          <Paragraph style={{ margin: 0 }}>{overall_comment}</Paragraph>
        </Card>
      )}
    </div>
  )
}
