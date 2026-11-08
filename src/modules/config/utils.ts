import type { VersionData } from '~/api/version';

export type SelectOption = [string, string];
/** 只有这几个端口字段会被渲染成输入框，故意收窄成字面量联合，好让 configState[key] 能推出 number */
export type PortFieldKey = 'port' | 'socks-port' | 'mixed-port' | 'redir-port' | 'mitm-port';
export type PortField = {
  key: PortFieldKey;
  label: string;
};

export const CONFIG_CHART_STYLE_PROPS = [{ id: 0 }, { id: 1 }, { id: 2 }, { id: 3 }];

export const LOG_LEVEL_OPTIONS: SelectOption[] = [
  ['debug', 'Debug'],
  ['info', 'Info'],
  ['warning', 'Warning'],
  ['error', 'Error'],
  ['silent', 'Silent'],
];

export const PORT_FIELDS: PortField[] = [
  { key: 'port', label: 'Http Port' },
  { key: 'socks-port', label: 'Socks5 Port' },
  { key: 'mixed-port', label: 'Mixed Port' },
  { key: 'redir-port', label: 'Redir Port' },
  { key: 'mitm-port', label: 'MITM Port' },
];

export const LANGUAGE_OPTIONS: SelectOption[] = [
  ['zh-CN', '简体中文'],
  ['zh-TW', '繁體中文'],
  ['en', 'English'],
  ['vi', 'Vietnamese'],
  ['ru', 'Русский'],
];

export const MODE_OPTIONS: SelectOption[] = [
  ['direct', 'Direct'],
  ['rule', 'Rule'],
  ['script', 'Script'],
  ['global', 'Global'],
];

export const TUN_STACK_OPTIONS: SelectOption[] = [
  ['system', 'System'],
  ['gvisor', 'gVisor'],
  ['mips', 'mips'],
  ['mixed', 'Mixed'],
];

export const CORE_META: Record<VersionData['core'], { name: string; link: string }> = {
  mihomo: { name: 'mihomo', link: 'https://github.com/MetaCubeX/mihomo' },
  'sing-box': { name: 'sing-box', link: 'https://github.com/SagerNet/sing-box' },
};
