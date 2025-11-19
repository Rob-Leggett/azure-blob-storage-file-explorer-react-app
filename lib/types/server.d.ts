/*
 * Enums / literal unions that exactly match server strings
 * (keeps strict typing and avoids number-enum mismatches).
 */

export type Status = 'successful' | 'failed' | 'queued' | 'skipped' | 'started' | 'not_started'

export type Category =
  | 'INTERCHANGE_RATES_VALIDATION'
  | 'SCHEME_FEES_VALIDATION'
  | 'BATCH_AUTOMATION_VALIDATION'
  | 'DCF_TO_DN_VALIDATION'
  | 'CTAF_EXTRACT_VALIDATION'
  | 'TAF_TO_TAF_VALIDATION'
  | 'RT_TO_DN_VALIDATION'
  | 'TAF_UPLOAD_VALIDATION'
  | 'SAP_STORE_GIFT_CARD_VALIDATION'
  | 'BATCH_AUTOMATION_GENERATION'
  | 'DCF_TXT_GENERATION'

export type Group = 'IST' | 'DN' | 'RT'

export type Strategy = 'SEARCH' | 'UPLOAD' | 'GENERATE'

export type FieldType = 'ENV' | 'BRAND' | 'DATE' | 'DATETIME' | 'BOOLEAN' | 'TEXT' | 'FILE'

export type FileRole =
  | 'INTERCHANGE_RATES_INPUT'
  | 'SCHEME_FEES_INPUT'
  | 'CTAF_INPUT'
  | 'RAW_TAF_INPUT'
  | 'EXPECTED_TAF_INPUT'
  | 'DCF_INPUT'
  | 'TAF_UPLOAD_INPUT'
  | 'SAP_FILES_INPUT'
