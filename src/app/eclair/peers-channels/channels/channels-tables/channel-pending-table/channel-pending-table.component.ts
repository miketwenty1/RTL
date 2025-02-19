import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';

import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { Channel, GetInfo } from '../../../../../shared/models/eclModels';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS, getPaginatorLabel, ScreenSizeEnum, FEE_RATE_TYPES, APICallStatusEnum } from '../../../../../shared/services/consts-enums-functions';
import { ApiCallsListECL } from '../../../../../shared/models/apiCallsPayload';
import { ECLChannelInformationComponent } from '../../channel-information-modal/channel-information.component';
import { LoggerService } from '../../../../../shared/services/logger.service';
import { CommonService } from '../../../../../shared/services/common.service';

import * as RTLActions from '../../../../../store/rtl.actions';
import * as fromRTLReducer from '../../../../../store/rtl.reducers';


@Component({
  selector: 'rtl-ecl-channel-pending-table',
  templateUrl: './channel-pending-table.component.html',
  styleUrls: ['./channel-pending-table.component.scss'],
  providers: [
    { provide: MatPaginatorIntl, useValue: getPaginatorLabel('Channels') }
  ]
})
export class ECLChannelPendingTableComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatSort, { static: false }) sort: MatSort|undefined;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator|undefined;
  public pendingChannels: Channel[];
  public totalBalance = 0;
  public displayedColumns: any[] = [];
  public channels: any;
  public myChanPolicy: any = {};
  public information: GetInfo = {};
  public numPeers = -1;
  public feeRateTypes = FEE_RATE_TYPES;
  public selFilter = '';
  public flgSticky = false;
  public pageSize = PAGE_SIZE;
  public pageSizeOptions = PAGE_SIZE_OPTIONS;
  public screenSize = '';
  public screenSizeEnum = ScreenSizeEnum;
  public errorMessage = '';
  public apisCallStatus: ApiCallsListECL = null;
  public apiCallStatusEnum = APICallStatusEnum;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject(), new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private store: Store<fromRTLReducer.RTLState>, private commonService: CommonService) {
    this.screenSize = this.commonService.getScreenSize();
    if (this.screenSize === ScreenSizeEnum.XS) {
      this.flgSticky = false;
      this.displayedColumns = ['state', 'alias', 'actions'];
    } else if (this.screenSize === ScreenSizeEnum.SM) {
      this.flgSticky = false;
      this.displayedColumns = ['state', 'alias', 'toLocal', 'toRemote', 'actions'];
    } else if (this.screenSize === ScreenSizeEnum.MD) {
      this.flgSticky = false;
      this.displayedColumns = ['state', 'alias', 'toLocal', 'toRemote', 'actions'];
    } else {
      this.flgSticky = true;
      this.displayedColumns = ['state', 'alias', 'toLocal', 'toRemote', 'actions'];
    }
  }

  ngOnInit() {
    this.store.select('ecl').
      pipe(takeUntil(this.unSubs[0])).
      subscribe((rtlStore) => {
        this.errorMessage = '';
        this.apisCallStatus = rtlStore.apisCallStatus;
        if (rtlStore.apisCallStatus.FetchChannels.status === APICallStatusEnum.ERROR) {
          this.errorMessage = (typeof (this.apisCallStatus.FetchChannels.message) === 'object') ? JSON.stringify(this.apisCallStatus.FetchChannels.message) : this.apisCallStatus.FetchChannels.message;
        }
        this.information = rtlStore.information;
        this.numPeers = (rtlStore.peers && rtlStore.peers.length) ? rtlStore.peers.length : 0;
        this.totalBalance = rtlStore.onchainBalance.total;
        this.pendingChannels = rtlStore.pendingChannels;
        this.loadChannelsTable();
        this.logger.info(rtlStore);
      });
  }

  ngAfterViewInit() {
    if (this.pendingChannels.length > 0) {
      this.loadChannelsTable();
    }
  }

  applyFilter() {
    this.channels.filter = this.selFilter.trim().toLowerCase();
  }

  onChannelClick(selChannel: Channel, event: any) {
    this.store.dispatch(new RTLActions.OpenAlert({ data: {
      channel: selChannel,
      channelsType: 'pending',
      component: ECLChannelInformationComponent
    } }));
  }

  loadChannelsTable() {
    this.pendingChannels.sort((a, b) => ((a.alias === b.alias) ? 0 : ((b.alias) ? 1 : -1)));
    this.channels = new MatTableDataSource<Channel>([...this.pendingChannels]);
    this.channels.sort = this.sort;
    this.channels.sortingDataAccessor = (data: any, sortHeaderId: string) => ((data[sortHeaderId] && isNaN(data[sortHeaderId])) ? data[sortHeaderId].toLocaleLowerCase() : data[sortHeaderId] ? +data[sortHeaderId] : null);
    this.channels.filterPredicate = (channel: Channel, fltr: string) => JSON.stringify(channel).toLowerCase().includes(fltr);
    this.channels.paginator = this.paginator;
    this.logger.info(this.channels);
  }

  onDownloadCSV() {
    if (this.channels.data && this.channels.data.length > 0) {
      this.commonService.downloadFile(this.channels.data, 'PendingChannels');
    }
  }

  ngOnDestroy() {
    this.unSubs.forEach((completeSub) => {
      completeSub.next(null);
      completeSub.complete();
    });
  }

}
