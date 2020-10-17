import {Client} from '@stomp/stompjs';
import {BehaviorSubject, interval, Subscription} from 'rxjs';
import {MeasurementService} from './measurement/MeasurementService';
import {IFormatter} from './formatter/IFormatter';
import {JsonFormatter} from './formatter/JsonFormatter';
import RSocketWebSocketClient from 'rsocket-websocket-client';
import {RSocketClient} from 'rsocket-core';
import {IdentitySerializer, JsonSerializer} from 'rsocket-core';
import {Player} from './model/Player';
import {STOP_SENDING_TIMEOUT, URL_RSOCKET} from '../../globalConfig';

export class RSocketSimulationConnection {
  private additionalData = this.randomString(1000, '0123456789abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ');
  private variable = this.makeId(30000);

  private sub: Subscription;

  private coinRefreshSub: any;
  private coinGetSub: any;
  private monstersUpdateSub: any;
  private playersAddedSub: any;
  private playerRemoveSub: any;
  private playerUpdateSub: any;
  private playerUpdateUserSub: any;

  private readonly nickname;
  private measurementService: MeasurementService;
  private timeForStartCommunication;
  private formatter: IFormatter;
  private client: RSocketClient;
  private rsocketObject: RSocketWebSocketClient;

  constructor(nickname, measurementService) {
    this.nickname = nickname;
    this.measurementService = measurementService;
    this.setFormatter(new JsonFormatter());
  }

  setFormatter(formatter): any {
    this.formatter = formatter;
  }

  initializeConnection(data, timeToSend): void {
    this.client = new RSocketClient({
      serializers: {
        data: JsonSerializer,
        metadata: IdentitySerializer
      },
      setup: {
        // ms btw sending keepalive to server
        keepAlive: 60000,
        // ms timeout if no keepalive response
        lifetime: 180000,
        // format of `data`
        dataMimeType: 'application/json',
        // format of `metadata`
        metadataMimeType: 'message/x.rsocket.routing.v0',
        payload: {
          data: this.formatter.prepareNicknamePayload(this.nickname)
        }
      },
      transport: new RSocketWebSocketClient({
        url: URL_RSOCKET})
    });

    this.client.connect().subscribe({
      onComplete: socket => {

        this.rsocketObject = socket;

        socket.requestStream({
          metadata: String.fromCharCode('monstersUpdate'.length) + 'monstersUpdate',
        }).subscribe({
          onComplete: () => console.log('complete'),
          onError: error => {
            console.log(error);
          },
          onNext: payload => {
          },
          onSubscribe: subscription => {
            console.error('========= Subskrybuje monsterUpdate ============');
            subscription.request(2147483640);
            this.monstersUpdateSub = subscription;
          }
        });

        socket.requestStream({
          metadata: String.fromCharCode('playersAdded'.length) + 'playersAdded',
        }).subscribe({
          onComplete: () => console.log('complete'),
          onError: error => {
            console.log(error);
          },
          onNext: payload => {
          },
          onSubscribe: subscription => {
            console.error('======== Subskrybuje playersAdded ===========');
            subscription.request(2147483641);
            this.playersAddedSub = subscription;
          },
        });

        socket.requestStream({
          metadata: String.fromCharCode('playerRemove'.length) + 'playerRemove',
        }).subscribe({
          onComplete: () => console.log('complete'),
          onError: error => {
            console.log(error);
          },
          onNext: payload => {
          },
          onSubscribe: subscription => {
            console.error('========= Subskrybuje playerRemove ============');
            subscription.request(2147483642);
            this.playerRemoveSub = subscription;
          },
        });

        socket.requestStream({
          metadata: String.fromCharCode('playerUpdate'.length) + 'playerUpdate',
        }).subscribe({
          onComplete: () => console.log('complete'),
          onError: error => {
            console.log(error);
          },
          onNext: playerToUpdate => {
            if (this.nickname === 'remote01' && playerToUpdate.data.nickname.match('remote*')) {
              const parsedPlayer: Player = playerToUpdate.data;
              const responseTimeInMillis = new Date().getTime() - playerToUpdate.data.requestTimestamp;
              this.measurementService.addMeasurementResponse(parsedPlayer.nickname, responseTimeInMillis,
                Math.ceil((playerToUpdate.data.requestTimestamp - this.timeForStartCommunication) / 1000),
                parsedPlayer.version, playerToUpdate.data.contentLength, playerToUpdate.data.requestTimestamp);
            }
          },
          onSubscribe: subscription => {
            console.error('========= Subskrybuje playerUpdate ============');
            subscription.request(2147483643);
            this.playerUpdateSub = subscription;
          },
        });

        socket.requestStream({
          data: this.formatter.prepareNicknamePayload(this.nickname),
          metadata: String.fromCharCode('playerUpdateUser'.length) + 'playerUpdateUser',
        }).subscribe({
          onComplete: () => console.log('complete'),
          onError: error => {
            console.log(error);
          },
          onNext: playerToUpdate => {
          },
          onSubscribe: subscription => {
            console.error('========= Subskrybuje specificPlayerUpdate ============');
            subscription.request(2147483644);
            this.playerUpdateUserSub = subscription;
          },
        });

        socket.requestStream({
          metadata: String.fromCharCode('coinGet'.length) + 'coinGet',
        }).subscribe({
          onComplete: () => console.log('complete'),
          onError: error => {
            console.log(error);
          },
          onNext: payload => {
          },
          onSubscribe: subscription => {
            console.error('========= Subskrybuje coinGet ============');
            subscription.request(2147483645);
            this.coinGetSub = subscription;
          },
        });

        socket.requestStream({
          metadata: String.fromCharCode('coinRefresh'.length) + 'coinRefresh',
        }).subscribe({
          onComplete: () => console.log('complete'),
          onError: error => {
            console.log(error);
          },
          onNext: payload => {
          },
          onSubscribe: subscription => {
            console.error('========= Subskrybuje refershCoin ============');
            subscription.request(2147483646);
            this.coinRefreshSub = subscription;
          },
        });
      },
      onError: error => {
        console.log(error);
      },
      onSubscribe: cancel => {
      }
    });

    this.timeForStartCommunication = new Date().getTime();
    setTimeout(() => {
      this.joinToGame(this.nickname);
      this.addPlayer(this.nickname);
      console.error('Polaczylem sie');
    }, timeToSend - 500);

    let timesRun = 0;
    let strategy = true;
    // data.additionalData = this.additionalData;
    setTimeout(() => {
      console.error('Zaczynam wysylac dane.');
      const sender = interval(20);
      this.sub = sender.subscribe(() => {
        timesRun += 1;
        if (timesRun === 300) {
          timesRun = 0;
          strategy = !strategy;
        }
        if (strategy) {
          data.positionX -= 4;
        } else {
          data.positionX += 4;
        }
        data.version++;

        this.sendPosition(data);
      });
    }, timeToSend);

    setTimeout(() => {
      this.sub.unsubscribe();
      console.error('Zakonczono komunikacje z serverem');
      this.disconnect();
    }, STOP_SENDING_TIMEOUT);
  }

  //////////////////////////////////////////////////////////////////////////////////////////////////////////////////////

  disconnect(): void {
    this.coinRefreshSub.cancel();
    this.coinGetSub.cancel();
    this.monstersUpdateSub.cancel();
    this.playersAddedSub.cancel();
    this.playerRemoveSub.cancel();
    this.playerUpdateSub.cancel();
    this.playerUpdateUserSub.cancel();

    this.rsocketObject.fireAndForget({
      data: this.formatter.prepareNicknamePayload(this.nickname),
      metadata: String.fromCharCode('disconnect'.length) + 'disconnect',
    });
    this.client.close();
  }

  sendPosition(dataToSend): void {
    const encodedData = this.formatter.encode(dataToSend);
    encodedData.contentLength = JSON.stringify(encodedData).length;
    encodedData.requestTimestamp = new Date().getTime();

    this.rsocketObject.fireAndForget({
      data: encodedData,
      metadata: String.fromCharCode('sendPosition'.length) + 'sendPosition'

    });
  }

  joinToGame(nickname: string): void {
    this.rsocketObject
      .requestResponse({
        metadata: String.fromCharCode('joinToGame'.length) + 'joinToGame',
      }).subscribe({
      onComplete: currentCoinPosition => {
      },
      onError: error => {
        console.log('got error with requestResponse');
      }
    });
  }

  addPlayer(nickname: string): void {
    this.rsocketObject.fireAndForget({
      data: this.formatter.prepareNicknamePayload(this.nickname),
      metadata: String.fromCharCode('addNewPlayers'.length) + 'addNewPlayers',
    });
  }

  makeId(length): string {
    let result = '';
    const characters = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    const charactersLength = characters.length;
    for (let i = 0; i < length; i++) {
      result += characters.charAt(Math.floor(Math.random() * charactersLength));
    }
    return result;
  }

  randomString(length, chars): string {
    let result = '';
    for (let i = length; i > 0; --i) {
      result += chars[Math.floor(Math.random() * chars.length)];
    }
    return result;
  }
}
