import {Component} from '@angular/core';

// @ts-ignore
import * as  data from '../../rsocketData.json';
import {RSocketSimulationConnection} from './RSocketSimulationConnection';
import {MeasurementService} from './measurement/MeasurementService';
import {DownloadService} from './downloader/DownloadService';

@Component({
  selector: 'app-root',
  templateUrl: './app.component.html',
  styleUrls: ['./app.component.css']
})
export class AppComponent {
  private downloadService: DownloadService;
  private readonly measurementService: MeasurementService;

  constructor() {
    const examplePlayers = (data as any).default;
    const simulationConnection = new Array(examplePlayers.length);
    this.measurementService = new MeasurementService();
    this.downloadService = new DownloadService(this.measurementService);

    for (let i = 5; i < 10; i++) {
      simulationConnection[i] = new RSocketSimulationConnection(examplePlayers[i].nickname, this.measurementService);
      simulationConnection[i].initializeConnection(examplePlayers[i], 1000 + 10000 * i);
    }
  }

  downloadFile(): void {
    this.downloadService.downloadResponseFile(this.measurementService.getResponseMeasurements());
  }
}
