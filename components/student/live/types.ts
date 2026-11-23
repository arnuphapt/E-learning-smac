import type { PlayerEndedState } from "@/components/live/player-ended"
import type { PlayerLeaderboardState } from "@/components/live/player-leaderboard"
import type { PlayerQuestionState } from "@/components/live/player-question"
import type { PlayerRevealState } from "@/components/live/player-reveal"

export interface TeamInfo {
  id?: string
  name?: string
  colorNo?: number
  rank?: number | null
  score?: number
}

export interface PlayerSessionViewState {
  id: string
  title: string
  phase: string
  total: number
  index: number
  playerCount: number
  players?: number
  team_mode: boolean
  teamBoard?: TeamInfo[]
  question?: PlayerQuestionState["question"]
  deadline?: string | null
  now?: string | null
  top5?: PlayerLeaderboardState["top5"]
  me?: PlayerQuestionState["me"] &
    PlayerRevealState["me"] &
    PlayerLeaderboardState["me"] &
    PlayerEndedState["me"] & {
      team?: TeamInfo | null
    }
}
