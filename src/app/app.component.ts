import { Component } from '@angular/core';

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
  private simulationConnection = new Array(10);
  private downloadService: DownloadService;
  private readonly measurementService: MeasurementService;

  constructor() {
    const examplePlayers = (data as any).default;
    this.measurementService = new MeasurementService();
    this.downloadService = new DownloadService(this.measurementService);

    setTimeout(() => {
        for (let i = 0; i < 5; i++) {
          this.simulationConnection[i] = new RSocketSimulationConnection(examplePlayers[i].nickname, this.measurementService);
          this.simulationConnection[i].initializeConnection(examplePlayers[i], 4000 + 500 * i);
        }
      }, 5000);
  }

  downloadFile(): void {
    this.downloadService.downloadResponseFile(this.measurementService.getResponseMeasurements());
  }
}
