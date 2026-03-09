import { useState, useEffect } from 'react'
import { Card, Select, Button, Typography, Radio, Input, Tag, Spin, Row, Col, message, Result, Space, Progress } from 'antd'
import {
  PlayCircleOutlined,
  CheckCircleOutlined,
  CloseCircleOutlined,
  QuestionCircleOutlined,
  RightOutlined,
  BulbOutlined,
  TrophyOutlined,
} from '@ant-design/icons'
import { generateQuiz, judgeQuiz, skipQuiz, getQuizStats } from '../api/quiz'

const { Title, Text, Paragraph } = Typography
const { TextArea } = Input

const TOPICS = [
  'Python', 'Java', 'JavaScript', 'C语言', 'C++',
  '数据结构与算法', '操作系统', '计算机组成原理', '计算机网络',
  '数据库', '计算机八股文', '设计模式', 'Linux',
  'Git', '前端基础', '后端基础', '系统设计',
]

const QUESTION_TYPES = ['判断题', '选择题', '简答题', '编程题']

const difficultyColors = { '简单': 'green', '中等': 'blue', '困难': 'red' }

export default function QuizPage() {
  const [topic, setTopic] = useState(null)
  const [questionType, setQuestionType] = useState(null)
  const [question, setQuestion] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [userAnswer, setUserAnswer] = useState('')
  const [judging, setJudging] = useState(false)
  const [result, setResult] = useState(null)
  const [stats, setStats] = useState(null)

  useEffect(() => {
    loadStats()
  }, [])

  const loadStats = async () => {
    try {
      const res = await getQuizStats()
      setStats(res.data)
    } catch {}
  }

  const handleGenerate = async () => {
    if (!topic || !questionType) {
      message.warning('请选择考察内容和题型')
      return
    }
    setGenerating(true)
    setQuestion(null)
    setResult(null)
    setUserAnswer('')
    try {
      const res = await generateQuiz(topic, questionType)
      setQuestion(res.data)
    } catch (err) {
      message.error('出题失败，请重试')
    } finally {
      setGenerating(false)
    }
  }

  const handleSubmit = async () => {
    if (!userAnswer.trim()) {
      message.warning('请输入你的答案')
      return
    }
    setJudging(true)
    try {
      const res = await judgeQuiz({
        question: question.question,
        question_type: questionType,
        correct_answer: question.correct_answer,
        knowledge_point: question.knowledge_point,
        topic,
        user_answer: userAnswer,
      })
      setResult(res.data)
      loadStats()
    } catch (err) {
      message.error('判题失败，请重试')
    } finally {
      setJudging(false)
    }
  }

  const handleSkip = async () => {
    setJudging(true)
    try {
      const res = await skipQuiz({
        question: question.question,
        question_type: questionType,
        correct_answer: question.correct_answer,
        knowledge_point: question.knowledge_point,
        topic,
        explanation: question.explanation,
      })
      setResult(res.data)
      loadStats()
    } catch (err) {
      message.error('操作失败')
    } finally {
      setJudging(false)
    }
  }

  const handleNext = () => {
    handleGenerate()
  }

  const renderAnswerInput = () => {
    if (!question) return null
    const disabled = !!result

    if (questionType === '判断题') {
      return (
        <Radio.Group
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          disabled={disabled}
          size="large"
        >
          <Space direction="vertical">
            <Radio value="对">对</Radio>
            <Radio value="错">错</Radio>
          </Space>
        </Radio.Group>
      )
    }

    if (questionType === '选择题' && question.options?.length > 0) {
      return (
        <Radio.Group
          value={userAnswer}
          onChange={(e) => setUserAnswer(e.target.value)}
          disabled={disabled}
          size="large"
        >
          <Space direction="vertical" className="w-full">
            {question.options.map((opt, i) => (
              <Radio key={i} value={opt.charAt(0)} className="w-full">
                {opt}
              </Radio>
            ))}
          </Space>
        </Radio.Group>
      )
    }

    return (
      <TextArea
        value={userAnswer}
        onChange={(e) => setUserAnswer(e.target.value)}
        placeholder={questionType === '编程题' ? '在此输入你的代码...' : '在此输入你的答案...'}
        autoSize={{ minRows: questionType === '编程题' ? 8 : 3, maxRows: 20 }}
        disabled={disabled}
        style={questionType === '编程题' ? { fontFamily: 'Consolas, Monaco, monospace' } : {}}
      />
    )
  }

  return (
    <div className="max-w-6xl mx-auto">
      <Row gutter={24}>
        <Col xs={24} lg={17}>
          <Card className="mb-4">
            <div className="flex items-center justify-between mb-4">
              <Title level={4} style={{ margin: 0 }}>AI 刷题练习</Title>
            </div>

            <div className="flex gap-3 mb-4 flex-wrap">
              <Select
                style={{ width: 200 }}
                placeholder="选择考察内容"
                value={topic}
                onChange={(val) => setTopic(Array.isArray(val) ? val[val.length - 1] : val)}
                showSearch
                options={TOPICS.map((t) => ({ label: t, value: t }))}
              />
              <Select
                style={{ width: 140 }}
                placeholder="选择题型"
                value={questionType}
                onChange={setQuestionType}
                options={QUESTION_TYPES.map((t) => ({ label: t, value: t }))}
              />
              <Button
                type="primary"
                icon={<PlayCircleOutlined />}
                onClick={handleGenerate}
                loading={generating}
              >
                {question ? '换一题' : '开始出题'}
              </Button>
            </div>

            {generating && (
              <div className="flex flex-col items-center justify-center py-16">
                <Spin size="large" />
                <Text type="secondary" className="mt-4">AI 正在出题...</Text>
              </div>
            )}

            {question && !generating && (
              <div>
                <div className="mb-3 flex items-center gap-2">
                  <Tag color={difficultyColors[question.difficulty] || 'blue'}>{question.difficulty}</Tag>
                  <Tag>{question.knowledge_point}</Tag>
                  <Tag color="cyan">{questionType}</Tag>
                </div>

                <Card
                  size="small"
                  className="mb-4"
                  style={{ background: '#fafafa' }}
                >
                  <Paragraph style={{ fontSize: 15, whiteSpace: 'pre-wrap', margin: 0 }}>
                    {question.question}
                  </Paragraph>
                </Card>

                <div className="mb-4">
                  {renderAnswerInput()}
                </div>

                {!result && (
                  <div className="flex gap-2">
                    <Button
                      type="primary"
                      onClick={handleSubmit}
                      loading={judging}
                      disabled={!userAnswer.trim()}
                    >
                      提交答案
                    </Button>
                    <Button
                      icon={<QuestionCircleOutlined />}
                      onClick={handleSkip}
                      loading={judging}
                    >
                      不会
                    </Button>
                  </div>
                )}

                {result && (
                  <Card
                    size="small"
                    className="mt-4"
                    style={{
                      border: `2px solid ${result.is_correct ? '#52c41a' : '#ff4d4f'}`,
                      background: result.is_correct ? '#f6ffed' : '#fff2f0',
                    }}
                  >
                    <div className="flex items-center gap-2 mb-2">
                      {result.is_correct ? (
                        <CheckCircleOutlined style={{ color: '#52c41a', fontSize: 20 }} />
                      ) : (
                        <CloseCircleOutlined style={{ color: '#ff4d4f', fontSize: 20 }} />
                      )}
                      <Text strong style={{ fontSize: 16, color: result.is_correct ? '#52c41a' : '#ff4d4f' }}>
                        {result.is_correct ? '回答正确！' : '回答错误'}
                      </Text>
                    </div>

                    <div className="mb-2">
                      <Text strong>正确答案：</Text>
                      <Paragraph style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                        {result.correct_answer}
                      </Paragraph>
                    </div>

                    <div className="mb-3">
                      <Text strong><BulbOutlined className="mr-1" />解析：</Text>
                      <Paragraph style={{ whiteSpace: 'pre-wrap', margin: '4px 0' }}>
                        {result.explanation}
                      </Paragraph>
                    </div>

                    <Button type="primary" icon={<RightOutlined />} onClick={handleNext}>
                      下一题
                    </Button>
                  </Card>
                )}
              </div>
            )}

            {!question && !generating && (
              <Result
                icon={<BulbOutlined style={{ color: '#1677ff' }} />}
                title="选择考察内容和题型，开始刷题"
                subTitle="AI 会根据你的做题记录智能出题，已掌握的知识点不再重复考察"
              />
            )}
          </Card>
        </Col>

        <Col xs={24} lg={7}>
          <Card title={<><TrophyOutlined className="mr-2" />刷题统计</>} size="small">
            {stats ? (
              <div>
                <div className="text-center mb-3">
                  <Progress
                    type="circle"
                    percent={stats.accuracy}
                    size={80}
                    format={(p) => <span style={{ fontSize: 14 }}>{p}%</span>}
                    strokeColor={stats.accuracy >= 70 ? '#52c41a' : '#faad14'}
                  />
                  <div className="mt-1">
                    <Text type="secondary">正确率</Text>
                  </div>
                </div>
                <div className="flex justify-between mb-2">
                  <Text type="secondary">总题数</Text>
                  <Text strong>{stats.total}</Text>
                </div>
                <div className="flex justify-between mb-3">
                  <Text type="secondary">答对</Text>
                  <Text strong style={{ color: '#52c41a' }}>{stats.correct}</Text>
                </div>

                {stats.mastered?.length > 0 && (
                  <div className="mb-3">
                    <Text strong style={{ fontSize: 13 }}>已掌握：</Text>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stats.mastered.map((k, i) => <Tag key={i} color="green" style={{ fontSize: 11 }}>{k}</Tag>)}
                    </div>
                  </div>
                )}

                {stats.weak?.length > 0 && (
                  <div>
                    <Text strong style={{ fontSize: 13 }}>需加强：</Text>
                    <div className="flex flex-wrap gap-1 mt-1">
                      {stats.weak.map((k, i) => <Tag key={i} color="orange" style={{ fontSize: 11 }}>{k}</Tag>)}
                    </div>
                  </div>
                )}

                {stats.total === 0 && (
                  <Text type="secondary" style={{ fontSize: 13 }}>还没有做题记录，开始刷题吧</Text>
                )}
              </div>
            ) : (
              <Spin size="small" />
            )}
          </Card>
        </Col>
      </Row>
    </div>
  )
}
