export interface IFormatter {
  decodePlayer(data): any;
  encode(data): any;
  prepareNicknamePayload(nickname: string): any;
}
