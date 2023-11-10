import { Component, Inject, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { Server } from "../../classes/server";
import { RequestService } from "../../shared/request.service";
import { ChartOptions, LegendItem } from "chart.js";
import { MAT_DIALOG_DATA } from "@angular/material/dialog";
import { BaseChartDirective } from "ng2-charts";

@Component({
	selector: 'app-activity',
	templateUrl: './stats-dialog.component.html',
	styleUrls: ['./stats-dialog.component.scss']
})
export class StatsDialogComponent implements OnDestroy {

	@ViewChild(BaseChartDirective) public chart!: BaseChartDirective;

	interval!: NodeJS.Timer;
	refreshRate = 1;
	labels: string[] = [];
	datasets: any[] = [];
	times: { [key: string]: number[] } = {};
	mode : 'raw' | 'difference' | 'sinceOpen' = 'sinceOpen';
	lineChartOptions: ChartOptions<'line'> = {
		plugins: {
			legend: {
				position: 'right',
				display: true,
				labels: {
					boxWidth: 2,
					color: 'white'
				},
				onHover: (evt, legendItem: LegendItem) => {
					this.chart.chart!.setActiveElements(
						this.chart.chart!.getDatasetMeta(
							legendItem.datasetIndex!
						).data!.map((x, i) => ({
							datasetIndex: legendItem.datasetIndex!,
							index: i,
						}))
					);

					this.chart.update();
				},
			},
		},
		interaction: {
			mode: 'index',
			intersect: false,
		},
		animation: false,
		scales: {
			x: {
				display: true,
				grid: {
					display: false
				}
			},
			y: {
				display: true
			}
		},
	};

	constructor(
		private request: RequestService,
		@Inject(MAT_DIALOG_DATA) public server: Server,
	) {
		const loop = async () => {
			await this.refreshData();
			setTimeout(() => loop(), this.refreshRate * 1000);
		};
		loop();
	}

	async refreshData() {
		const newVals = await this.request.post('stats/server', {}, undefined, undefined, this.server);
		newVals.map((newVal: { Variable_name: any; Value: any; }) => {
			if (!this.times[newVal.Variable_name]) {
				this.times[newVal.Variable_name] = [];
			}
			this.times[newVal.Variable_name].push(+newVal.Value);
		});

		for (const [Variable_name, Values] of Object.entries(this.times)) {
			let datas = [0];
			if (this.mode === 'difference') {
				for (let i = 1; i < Values.length; i++) {
					datas.push(Values[i] - Values[i-1]);
				}
			} else if (this.mode === 'sinceOpen') {
				for (let i = 1; i < Values.length; i++) {
					datas.push(Values[i] - Values[0]);
				}
			} else {
				datas = Values;
			}

			const datasetIndex = this.datasets.findIndex(dataset => dataset.label === Variable_name);
			if (datasetIndex >= 0) {
				this.datasets[datasetIndex].data = datas
			} else {
				this.datasets.push({
					data: datas,
					label: Variable_name,
					borderWidth: 2,
					tension: 0.1,
					radius: 0,
				});
			}
		}

		this.labels.push('');
		this.chart.update();
	}

	ngOnDestroy() {
		clearInterval(this.interval);
	}
}
