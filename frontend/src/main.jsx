import React from 'react'
import ReactDOM from 'react-dom/client'
import { BrowserRouter } from 'react-router-dom'
import { ConfigProvider } from 'antd'
import zhCN from 'antd/locale/zh_CN'
import enUS from 'antd/locale/en_US'
import { I18nProvider } from './i18n'
import useThemeStore from './store/useThemeStore'
import { lightTheme, darkTheme } from './theme/antdTheme'
import App from './App'
import './index.css'

function Root() {
  const theme = useThemeStore((s) => s.theme)
  const language = useThemeStore((s) => s.language)
  const antdTheme = theme === 'dark' ? darkTheme : lightTheme
  const antdLocale = language === 'zh' ? zhCN : enUS

  return (
    <ConfigProvider theme={antdTheme} locale={antdLocale}>
      <I18nProvider>
        <App />
      </I18nProvider>
    </ConfigProvider>
  )
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <BrowserRouter>
      <Root />
    </BrowserRouter>
  </React.StrictMode>,
)
