import ReactECharts from 'echarts-for-react'

export default function RadarChart({ indicators, values, title }) {
  const option = {
    title: {
      text: title || '',
      left: 'center',
      textStyle: { fontSize: 14, fontWeight: 500 },
    },
    radar: {
      indicator: indicators.map((name, i) => ({
        name,
        max: 100,
      })),
      shape: 'circle',
      splitNumber: 4,
      axisName: {
        color: '#666',
        fontSize: 12,
      },
    },
    series: [
      {
        type: 'radar',
        data: [
          {
            value: values,
            areaStyle: { color: 'rgba(22, 119, 255, 0.15)' },
            lineStyle: { color: '#1677ff', width: 2 },
            itemStyle: { color: '#1677ff' },
          },
        ],
      },
    ],
    tooltip: {},
  }

  return <ReactECharts option={option} style={{ height: 320 }} />
}
