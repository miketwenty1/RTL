import { Component, OnInit, OnDestroy, ViewChild, AfterViewInit } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';

import { GetInfo, Channel } from '../../../../../shared/models/clModels';
import { PAGE_SIZE, PAGE_SIZE_OPTIONS, getPaginatorLabel, ScreenSizeEnum, FEE_RATE_TYPES, AlertTypeEnum, APICallStatusEnum, CLChannelPendingState } from '../../../../../shared/services/consts-enums-functions';
import { ApiCallsListCL } from '../../../../../shared/models/apiCallsPayload';
import { LoggerService } from '../../../../../shared/services/logger.service';
import { CommonService } from '../../../../../shared/services/common.service';
import { CLChannelInformationComponent } from '../../channel-information-modal/channel-information.component';

import { RTLEffects } from '../../../../../store/rtl.effects';
import * as RTLActions from '../../../../../store/rtl.actions';
import * as CLActions from '../../../../store/cl.actions';
import * as fromRTLReducer from '../../../../../store/rtl.reducers';
import { CLBumpFeeComponent } from '../../bump-fee-modal/bump-fee.component';

@Component({
  selector: 'rtl-cl-channel-pending-table',
  templateUrl: './channel-pending-table.component.html',
  styleUrls: ['./channel-pending-table.component.scss'],
  providers: [
    { provide: MatPaginatorIntl, useValue: getPaginatorLabel('Channels') }
  ]
})
export class CLChannelPendingTableComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild(MatSort, { static: false }) sort: MatSort|undefined;
  @ViewChild(MatPaginator, { static: false }) paginator: MatPaginator|undefined;
  public isCompatibleVersion = false;
  public totalBalance = 0;
  public displayedColumns: any[] = [];
  public channelsData: Channel[] = [];
  public channels: any;
  public myChanPolicy: any = {};
  public information: GetInfo = {};
  public numPeers = -1;
  public feeRateTypes = FEE_RATE_TYPES;
  public selFilter = '';
  public flgSticky = false;
  public CLChannelPendingState = CLChannelPendingState;
  public pageSize = PAGE_SIZE;
  public pageSizeOptions = PAGE_SIZE_OPTIONS;
  public screenSize = '';
  public screenSizeEnum = ScreenSizeEnum;
  public errorMessage = '';
  public apisCallStatus: ApiCallsListCL = null;
  public apiCallStatusEnum = APICallStatusEnum;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject(), new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private store: Store<fromRTLReducer.RTLState>, private rtlEffects: RTLEffects, private commonService: CommonService) {
    this.screenSize = this.commonService.getScreenSize();
    if (this.screenSize === ScreenSizeEnum.XS) {
      this.flgSticky = false;
      this.displayedColumns = ['alias', 'state', 'actions'];
    } else if (this.screenSize === ScreenSizeEnum.SM) {
      this.flgSticky = false;
      this.displayedColumns = ['alias', 'connected', 'state', 'actions'];
    } else if (this.screenSize === ScreenSizeEnum.MD) {
      this.flgSticky = false;
      this.displayedColumns = ['alias', 'connected', 'state', 'msatoshi_total', 'actions'];
    } else {
      this.flgSticky = true;
      this.displayedColumns = ['alias', 'connected', 'state', 'msatoshi_total', 'actions'];
    }
  }

  ngOnInit() {
    this.store.select('cl').
      pipe(takeUntil(this.unSubs[0])).
      subscribe((rtlStore) => {
        this.errorMessage = '';
        this.apisCallStatus = rtlStore.apisCallStatus;
        if (rtlStore.apisCallStatus.FetchChannels.status === APICallStatusEnum.ERROR) {
          this.errorMessage = (typeof (this.apisCallStatus.FetchChannels.message) === 'object') ? JSON.stringify(this.apisCallStatus.FetchChannels.message) : this.apisCallStatus.FetchChannels.message;
        }
        this.information = rtlStore.information;
        if (this.information.api_version) {
          this.isCompatibleVersion = this.commonService.isVersionCompatible(this.information.api_version, '0.4.2');
        }
        this.numPeers = (rtlStore.peers && rtlStore.peers.length) ? rtlStore.peers.length : 0;
        this.totalBalance = rtlStore.balance.totalBalance;
        this.channelsData = rtlStore.allChannels.filter((channel) => !(channel.state === 'CHANNELD_NORMAL' && channel.connected));
        this.channelsData = this.channelsData.sort((a, b) => ((this.CLChannelPendingState[a.state] >= this.CLChannelPendingState[b.state]) ? 1 : -1));
        if (this.channelsData && this.channelsData.length > 0) {
          this.loadChannelsTable(this.channelsData);
        }
        this.logger.info(rtlStore);
      });
  }

  ngAfterViewInit() {
    if (this.channelsData && this.channelsData.length > 0) {
      this.loadChannelsTable(this.channelsData);
    }
  }

  applyFilter() {
    this.channels.filter = this.selFilter.trim().toLowerCase();
  }

  onBumpFee(selChannel: Channel) {
    this.store.dispatch(new RTLActions.OpenAlert({ data: {
      channel: selChannel,
      component: CLBumpFeeComponent
    } }));
  }

  onChannelClick(selChannel: Channel, event: any) {
    this.store.dispatch(new RTLActions.OpenAlert({ data: {
      channel: selChannel,
      showCopy: true,
      component: CLChannelInformationComponent
    } }));
  }

  onChannelClose(channelToClose: Channel) {
    this.store.dispatch(new RTLActions.OpenConfirmation({ data: {
      type: AlertTypeEnum.CONFIRM,
      alertTitle: 'Force Close Channel',
      titleMessage: 'Force closing channel: ' + channelToClose.channel_id,
      noBtnText: 'Cancel',
      yesBtnText: 'Force Close'
    } }));
    this.rtlEffects.closeConfirm.
      pipe(takeUntil(this.unSubs[3])).
      subscribe((confirmRes) => {
        if (confirmRes) {
          this.store.dispatch(new CLActions.CloseChannel({ channelId: channelToClose.channel_id, force: true }));
        }
      });
  }

  loadChannelsTable(mychannels) {
    mychannels.sort((a, b) => ((a.active === b.active) ? 0 : ((b.active) ? 1 : -1)));
    this.channels = new MatTableDataSource<Channel>([...mychannels]);
    this.channels.filterPredicate = (channel: Channel, fltr: string) => {
      const newChannel = ((channel.connected) ? 'connected' : 'disconnected') + (channel.channel_id ? channel.channel_id.toLowerCase() : '') +
      (channel.short_channel_id ? channel.short_channel_id.toLowerCase() : '') + (channel.id ? channel.id.toLowerCase() : '') + (channel.alias ? channel.alias.toLowerCase() : '') +
      (channel.private ? 'private' : 'public') + ((channel.state && this.CLChannelPendingState[channel.state]) ? this.CLChannelPendingState[channel.state].toLowerCase() : '') +
      (channel.funding_txid ? channel.funding_txid.toLowerCase() : '') + (channel.msatoshi_to_us ? channel.msatoshi_to_us : '') +
      (channel.msatoshi_total ? channel.msatoshi_total : '') + (channel.their_channel_reserve_satoshis ? channel.their_channel_reserve_satoshis : '') +
      (channel.our_channel_reserve_satoshis ? channel.our_channel_reserve_satoshis : '') + (channel.spendable_msatoshi ? channel.spendable_msatoshi : '');
      return newChannel.includes(fltr);
    };
    this.channels.sort = this.sort;
    this.channels.sortingDataAccessor = (data: any, sortHeaderId: string) => {
      switch (sortHeaderId) {
        case 'state':
          return this.CLChannelPendingState[data.state];

        default:
          return (data[sortHeaderId] && isNaN(data[sortHeaderId])) ? data[sortHeaderId].toLocaleLowerCase() : data[sortHeaderId] ? +data[sortHeaderId] : null;
      }
    };
    this.channels.paginator = this.paginator;
    this.logger.info(this.channels);
  }

  onDownloadCSV() {
    if (this.channels.data && this.channels.data.length > 0) {
      this.commonService.downloadFile(this.channels.data, 'Pending-inactive-channels');
    }
  }

  ngOnDestroy() {
    this.unSubs.forEach((completeSub) => {
      completeSub.next(null);
      completeSub.complete();
    });
  }

}
