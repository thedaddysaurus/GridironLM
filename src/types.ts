export interface SleeperUser {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
}

export interface Player {
  id: string;
  first_name: string;
  last_name: string;
  full_name: string;
  position: string;
  team: string | null;
  age: number | null;
  years_exp: number | null;
}

export interface OwnerDetails {
  user_id: string;
  username: string;
  display_name: string;
  avatar: string | null;
  team_name: string;
}

export interface RosterSettings {
  wins: number;
  losses: number;
  ties: number;
  fpts: number;
  fpts_decimal: number;
  fpts_against: number;
  fpts_against_decimal: number;
  division?: number;
  waiver_position?: number;
}

export interface RichRoster {
  roster_id: number;
  owner_id: string;
  settings: RosterSettings;
  ownerDetails: OwnerDetails;
  players: Player[];
  starters: Player[];
  bench: Player[];
  pointsThisWeek: number;
  matchupId: number | null;
  startersIdsWithPoints: Record<string, number>;
}

export interface ActiveMatchTeam {
  roster_id: number;
  team_name: string;
  username: string;
  avatar: string | null;
  owner_id: string;
  points: number;
}

export interface ActiveMatch {
  matchupId: number;
  teams: ActiveMatchTeam[];
}

export interface LeagueDetails {
  leagueId: string;
  name: string;
  status: string;
  season: string;
  totalRosters: number;
  currentWeek: number;
  userRoster: RichRoster | null;
  standings: RichRoster[];
  matches: ActiveMatch[];
  rosterPositions: string[];
}

export interface LeagueOverview {
  league_id: string;
  name: string;
  season: string;
  status: string;
  total_rosters: number;
  draft_id?: string;
  user_id?: string;
}
