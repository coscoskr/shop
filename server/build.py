#!/usr/bin/env python3
"""把 Apps Script 的 Code.gs 轉成 ES 模組 code.js(商業邏輯本身不改,只在尾端加上匯出)"""
import re, sys
src = open(sys.argv[1], encoding='utf-8').read()
names = re.findall(r'^function ([A-Za-z0-9_]+)\(', src, re.M)
BLOCK = {'setup', 'authAll', 'authDrive', 'doGet', 'doPost', 'page_', 'adminUploadImage', 'lineCallback'}
pub = [n for n in names if not n.endswith('_') and n not in BLOCK]
out = ['// 由 Code.gs 自動產生(build.py),請不要直接修改;要改請改 Code.gs 再重新產生', src, '',
       '/* ===== 以下由 build.py 加入 ===== */',
       'export const API = {' + ', '.join(pub) + '};',
       'export const INTERNAL = {' + ', '.join(names) + '};',
       'export { H };',
       'export function __reset() { SS_ = null; SHC_ = {}; RC_ = {}; }', '']
open(sys.argv[2], 'w', encoding='utf-8').write('\n'.join(out))
print('public API:', len(pub), 'internal:', len(names))
