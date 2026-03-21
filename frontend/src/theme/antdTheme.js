import { colors, borderRadius } from './tokens'

export const lightTheme = {
  token: {
    colorPrimary: colors.brand.blue,
    colorSuccess: colors.semantic.success,
    colorWarning: colors.semantic.warning,
    colorError: colors.semantic.error,
    colorInfo: colors.semantic.info,
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: parseInt(borderRadius.md),
    colorBgContainer: colors.light.surface.card,
    colorBgLayout: colors.light.surface.base,
    colorBgElevated: colors.light.surface.overlay,
    colorText: colors.light.text.primary,
    colorTextSecondary: colors.light.text.secondary,
    colorTextTertiary: colors.light.text.tertiary,
    colorTextDisabled: colors.light.text.disabled,
    colorBorder: colors.light.border.default,
    colorBorderSecondary: colors.light.border.default,
  },
  components: {
    Button: {
      borderRadius: parseInt(borderRadius.md),
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
    },
    Card: {
      borderRadiusLG: parseInt(borderRadius.lg),
      boxShadow: 'none',
    },
    Input: {
      borderRadius: parseInt(borderRadius.md),
      activeShadow: '0 0 0 3px rgba(0, 102, 255, 0.1)',
    },
    Table: {
      borderColor: colors.light.border.default,
      headerBg: 'transparent',
      rowHoverBg: 'rgba(0, 102, 255, 0.02)',
    },
    Modal: {
      borderRadiusLG: parseInt(borderRadius.xl),
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'transparent',
      horizontalItemSelectedColor: colors.brand.blue,
    },
  },
}

export const darkTheme = {
  token: {
    colorPrimary: colors.brand.blue,
    colorSuccess: colors.semantic.success,
    colorWarning: colors.semantic.warning,
    colorError: colors.semantic.error,
    colorInfo: colors.semantic.info,
    fontFamily: "'DM Sans', sans-serif",
    borderRadius: parseInt(borderRadius.md),
    colorBgContainer: colors.dark.surface.card,
    colorBgLayout: colors.dark.surface.base,
    colorBgElevated: colors.dark.surface.overlay,
    colorText: colors.dark.text.primary,
    colorTextSecondary: colors.dark.text.secondary,
    colorTextTertiary: colors.dark.text.tertiary,
    colorTextDisabled: colors.dark.text.disabled,
    colorBorder: colors.dark.border.default,
    colorBorderSecondary: colors.dark.border.default,
  },
  components: {
    Button: {
      borderRadius: parseInt(borderRadius.md),
      primaryShadow: 'none',
      defaultShadow: 'none',
      dangerShadow: 'none',
    },
    Card: {
      borderRadiusLG: parseInt(borderRadius.lg),
      boxShadow: 'none',
    },
    Input: {
      borderRadius: parseInt(borderRadius.md),
      activeShadow: '0 0 0 3px rgba(0, 102, 255, 0.15)',
    },
    Select: {
      colorBorder: 'rgba(255, 255, 255, 0.25)',
      colorTextPlaceholder: 'rgba(255, 255, 255, 0.45)',
    },
    Table: {
      borderColor: colors.dark.border.default,
      headerBg: 'transparent',
      rowHoverBg: 'rgba(0, 102, 255, 0.04)',
    },
    Modal: {
      borderRadiusLG: parseInt(borderRadius.xl),
      contentBg: colors.dark.surface.overlay,
      headerBg: colors.dark.surface.overlay,
    },
    Menu: {
      itemBg: 'transparent',
      itemSelectedBg: 'transparent',
      horizontalItemSelectedColor: colors.brand.blue,
    },
  },
}
