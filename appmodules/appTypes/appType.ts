import { Player } from "../gameApp/gameModule/player"

export type PlayerAttributes = {
    dclID: string,
    ethAdd: string,
    realm: string
}

export type TeamListType = {
    ATT1: Player | null,
    ATT2: Player | null,
    DEF:  Player | null
}

export enum TeamType {
    SANTA,
    KRAMPUS
}

export enum RoleType {
    ATT1,
    ATT2,
    DEF
}

export enum PlayerStatus {
    SILVER,
    RED,
    SPECTATOR
}

export enum GameTurn {
    SILVER,
    RED,
    LASER
}

export enum GameTheme {
    THEME1 = 'DEFAULT',
    THEME2 = 'RUINS',
    THEME3 = 'HALLOWEEN',
    THEME4 = 'POLAR'
}