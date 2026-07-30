import rules from '../../../shared/stat_rules.json'

export const BLOWOUT_MARGIN = rules.blowout_margin
export const CLOSE_GAME_MARGIN = rules.close_game_margin

export const isBlowout = (margin: number) => margin >= BLOWOUT_MARGIN
export const isCloseGame = (margin: number) => margin > 0 && margin <= CLOSE_GAME_MARGIN
