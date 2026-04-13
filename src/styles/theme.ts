import type { GlobalThemeOverrides } from 'naive-ui'

// Scientific Professional Theme for Naive UI
// Deep Navy + Emerald配色，适合研究/数据科学家用户

export const themeOverrides: GlobalThemeOverrides = {
  common: {
    // Primary: Deep Navy
    primaryColor: '#1E3A5F',
    primaryColorHover: '#17304D',
    primaryColorPressed: '#12263B',
    primaryColorSuppl: '#5693C9',

    // Backgrounds
    bodyColor: '#F8FAFC',
    cardColor: '#FFFFFF',
    modalColor: '#FFFFFF',
    popoverColor: '#FFFFFF',
    tableColor: '#FFFFFF',
    inputColor: '#FFFFFF',
    actionColor: '#F1F5F9',

    // Text
    textColorBase: '#0F172A',
    textColor1: '#0F172A',
    textColor2: '#475569',
    textColor3: '#94A3B8',

    // Borders
    dividerColor: '#E4E7EB',
    borderColor: '#E4E7EB',

    // Hover state - color shift, not elevation
    hoverColor: 'rgba(30, 58, 95, 0.06)',

    // Radius (Flat Design)
    borderRadius: '8px',
    borderRadiusSmall: '6px',

    // Typography - Scientific fonts
    fontSize: '14px',
    fontSizeMedium: '14px',
    heightMedium: '36px',
    fontFamily: 'Exo, Inter, system-ui, -apple-system, sans-serif',
    fontFamilyMono: 'Roboto Mono, JetBrains Mono, Consolas, monospace',

    // Success/Accent: Emerald
    successColor: '#059669',
    successColorHover: '#047857',
    successColorPressed: '#065F46',

    // Error
    errorColor: '#DC2626',
    errorColorHover: '#B91C1C',
    errorColorPressed: '#991B1B',

    // Warning
    warningColor: '#D97706',
    warningColorHover: '#B45309',
    warningColorPressed: '#92400E',

    // Info/Secondary
    infoColor: '#2563EB',
    infoColorHover: '#1D4ED8',
    infoColorPressed: '#1E40AF',
  },

  Layout: {
    color: '#F8FAFC',
    siderColor: '#FFFFFF',
    headerColor: '#FFFFFF',
  },

  Menu: {
    // Active states - Deep Navy
    itemTextColorActive: '#1E3A5F',
    itemTextColorActiveHover: '#17304D',
    itemTextColorChildActive: '#1E3A5F',
    itemIconColorActive: '#1E3A5F',
    itemIconColorActiveHover: '#17304D',
    itemColorActive: 'rgba(30, 58, 95, 0.08)',
    itemColorActiveHover: 'rgba(30, 58, 95, 0.12)',
    arrowColorActive: '#1E3A5F',
    // Inactive
    itemTextColor: '#475569',
    itemTextColorHover: '#0F172A',
    itemIconColor: '#475569',
    itemIconColorHover: '#0F172A',
  },

  Button: {
    // Primary button
    textColorPrimary: '#FFFFFF',
    colorPrimary: '#1E3A5F',
    colorHoverPrimary: '#17304D',
    colorPressedPrimary: '#12263B',
    // Secondary button
    textColorDefault: '#0F172A',
    colorDefault: '#F1F5F9',
    colorHoverDefault: '#E4E7EB',
    colorPressedDefault: '#D1D5DB',
    // Success button
    textColorSuccess: '#FFFFFF',
    colorSuccess: '#059669',
    colorHoverSuccess: '#047857',
    colorPressedSuccess: '#065F46',
  },

  Input: {
    color: '#FFFFFF',
    colorFocus: '#FFFFFF',
    border: '1px solid #E4E7EB',
    borderHover: '1px solid #94A3B8',
    borderFocus: '1px solid #1E3A5F',
    placeholderColor: '#94A3B8',
    caretColor: '#1E3A5F',
    textColor: '#0F172A',
  },

  Card: {
    color: '#FFFFFF',
    borderColor: '#E4E7EB',
    titleTextColor: '#0F172A',
  },

  Modal: {
    color: '#FFFFFF',
  },

  Tag: {
    borderRadius: '6px',
  },

  Table: {
    thColor: '#F1F5F9',
    tdColor: '#FFFFFF',
    thTextColor: '#0F172A',
    tdTextColor: '#475569',
    borderColor: '#E4E7EB',
  },

  Tabs: {
    tabTextColorLine: '#475569',
    tabTextColorActiveLine: '#1E3A5F',
    tabTextColorHoverLine: '#17304D',
    barColor: '#1E3A5F',
  },

  Switch: {
    railColorActive: '#059669',
  },

  Checkbox: {
    colorChecked: '#1E3A5F',
    checkMarkColor: '#FFFFFF',
  },

  Select: {
    peers: {
      InternalSelection: {
        textColor: '#0F172A',
        placeholderColor: '#94A3B8',
        border: '1px solid #E4E7EB',
        borderHover: '1px solid #94A3B8',
        borderFocus: '1px solid #1E3A5F',
        borderActive: '1px solid #1E3A5F',
      },
    },
  },

  Message: {
    textColorSuccess: '#059669',
    textColorError: '#DC2626',
    textColorWarning: '#D97706',
    textColorInfo: '#2563EB',
  },

  Notification: {
    textColorSuccess: '#059669',
    textColorError: '#DC2626',
    textColorWarning: '#D97706',
    textColorInfo: '#2563EB',
  },
}

// Dark Mode Theme Overrides
export const darkThemeOverrides: GlobalThemeOverrides = {
  common: {
    primaryColor: '#78A8D3',
    primaryColorHover: '#9FC1E0',
    primaryColorPressed: '#5693C9',
    primaryColorSuppl: '#C5D9ED',

    bodyColor: '#0F172A',
    cardColor: '#1E293B',
    modalColor: '#1E293B',
    popoverColor: '#1E293B',
    tableColor: '#1E293B',
    inputColor: '#1E293B',
    actionColor: '#334155',

    textColorBase: '#E2E8F0',
    textColor1: '#E2E8F0',
    textColor2: '#94A3B8',
    textColor3: '#64748B',

    dividerColor: '#334155',
    borderColor: '#334155',
    hoverColor: 'rgba(120, 168, 211, 0.08)',
  },

  Layout: {
    color: '#0F172A',
    siderColor: '#1E293B',
    headerColor: '#1E293B',
  },

  Card: {
    color: '#1E293B',
    borderColor: '#334155',
  },

  Input: {
    color: '#1E293B',
    colorFocus: '#1E293B',
    border: '1px solid #334155',
    borderHover: '1px solid #475569',
    borderFocus: '1px solid #78A8D3',
    textColor: '#E2E8F0',
    placeholderColor: '#64748B',
  },

  Menu: {
    itemTextColor: '#94A3B8',
    itemTextColorHover: '#E2E8F0',
    itemTextColorActive: '#78A8D3',
    itemColorActive: 'rgba(120, 168, 211, 0.12)',
    siderColor: '#1E293B',
  },

  Button: {
    textColorPrimary: '#0F172A',
    colorPrimary: '#78A8D3',
    textColorDefault: '#E2E8F0',
    colorDefault: '#334155',
    colorHoverDefault: '#475569',
  },
}