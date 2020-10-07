import {IFormatter} from "./IFormatter";

export class JsonFormatter implements IFormatter {
  decodePlayer(data): any {
    return JSON.parse(data.body);
  }

  encode(data): any {
    return data;
  }

  prepareNicknamePayload(nickname: string): any {
    return {'nickname': nickname}
  }
}

