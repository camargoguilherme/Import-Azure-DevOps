import { Component, OnInit } from '@angular/core';

import { IterationDTO } from 'src/app/shared/models/dtos/iteration.dto';
import { ProjectDTO } from 'src/app/shared/models/dtos/project.dto';
import { FeatureDTO } from 'src/app/shared/models/dtos/feature.dto';
import { AuthenticationService } from 'src/app/shared/services/authentication.service';
import { AzureDevOpsService } from 'src/app/shared/services/azure-devops.service';
import { ImportXlsxService } from 'src/app/shared/services/import-xlsx.service';
import { NotificationService } from 'src/app/shared/services/notification.service';
import { TeamDTO } from 'src/app/shared/models/dtos/team';


@Component({
  selector: 'app-reports',
  templateUrl: './reports.component.html',
  styleUrls: ['./reports.component.scss']
})
export class ReportsComponent implements OnInit {
  projects: ProjectDTO[] = [];
  projectSelected: string = undefined;
  workItemsList: any[] = [];
  teams: TeamDTO[] = [];
  iterations: IterationDTO[] = [];
  iterationsSelected: string[] = [];
  teamsSelected: string[] = [];

  constructor(
    private authenticationService: AuthenticationService,
    private azureDevOpsService: AzureDevOpsService,
    private notificationService: NotificationService,
  ) { }

  ngOnInit() {
    this.authenticationService.validateSession().then(result => {
      this.handleProjects();
    });
  }

  private sortByName(itemA: any, itemB: any) {
    return itemA.name.localeCompare(itemB.name);
  }


  async handleProjects() {
    const projects = await this.azureDevOpsService.getProjects();
    this.projects = projects;
  }

  async handleTeams() {
    const teams = await this.azureDevOpsService.getTeams(this.projectSelected);
    teams.sort(this.sortByName)
    this.teams = teams;
  }

  async handleIterations() {
    if (this.projectSelected == null) return;

    const iterations = await this.azureDevOpsService.getIterations(this.projectSelected);
    iterations.sort(this.sortByName);
    this.iterations = iterations;
  }

  async handleChangeProject() {
    await this.handleTeams();
    if (this.teams.length == 1) {
      this.teamsSelected = this.teams.map(team => team.name);
      await this.handleIterations();
    }

    this.getAllWorkList();
  }

  async handleChangeTeams() {
    await this.handleIterations();
    this.getAllWorkList();
  }


  getAllWorkList() {
    this.azureDevOpsService.getAllWorkItems(this.projectSelected, this.teamsSelected, this.iterationsSelected).subscribe(workItemsList => {
      this.workItemsList = workItemsList;
    });
  }

  handleDownloadXlsx() {
    this.azureDevOpsService.downloadWorkItems(this.workItemsList, this.projectSelected);
  }
}
