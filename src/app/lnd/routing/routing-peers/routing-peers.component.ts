import { Component, OnInit, ViewChild, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { Store } from '@ngrx/store';
import { MatSort } from '@angular/material/sort';
import { MatTableDataSource } from '@angular/material/table';
import { MatPaginator, MatPaginatorIntl } from '@angular/material/paginator';

import { ForwardingEvent, RoutingPeers } from '../../../shared/models/lndModels';
import { AlertTypeEnum, APICallStatusEnum, DataTypeEnum, getPaginatorLabel, PAGE_SIZE, PAGE_SIZE_OPTIONS, ScreenSizeEnum } from '../../../shared/services/consts-enums-functions';
import { ApiCallsListLND } from '../../../shared/models/apiCallsPayload';
import { LoggerService } from '../../../shared/services/logger.service';
import { CommonService } from '../../../shared/services/common.service';

import * as RTLActions from '../../../store/rtl.actions';
import * as fromRTLReducer from '../../../store/rtl.reducers';

@Component({
  selector: 'rtl-routing-peers',
  templateUrl: './routing-peers.component.html',
  styleUrls: ['./routing-peers.component.scss'],
  providers: [
    { provide: MatPaginatorIntl, useValue: getPaginatorLabel('Peers') }
  ]
})
export class RoutingPeersComponent implements OnInit, OnDestroy {

  @ViewChild('tableIn', { read: MatSort, static: false }) sortIn: MatSort;
  @ViewChild('tableOut', { read: MatSort, static: false }) sortOut: MatSort;
  @ViewChild('paginatorIn', { static: false }) paginatorIn: MatPaginator|undefined;
  @ViewChild('paginatorOut', { static: false }) paginatorOut: MatPaginator|undefined;
  public routingPeersData = [];
  public displayedColumns: any[] = [];
  public RoutingPeersIncoming: any;
  public RoutingPeersOutgoing: any;
  public flgSticky = false;
  public pageSize = PAGE_SIZE;
  public pageSizeOptions = PAGE_SIZE_OPTIONS;
  public screenSize = '';
  public screenSizeEnum = ScreenSizeEnum;
  public errorMessage = '';
  public filterIn = '';
  public filterOut = '';
  public apisCallStatus: ApiCallsListLND = null;
  public apiCallStatusEnum = APICallStatusEnum;
  private unSubs: Array<Subject<void>> = [new Subject(), new Subject(), new Subject()];

  constructor(private logger: LoggerService, private commonService: CommonService, private store: Store<fromRTLReducer.RTLState>) {
    this.screenSize = this.commonService.getScreenSize();
    if (this.screenSize === ScreenSizeEnum.XS) {
      this.flgSticky = false;
      this.displayedColumns = ['chan_id', 'events', 'actions'];
    } else if (this.screenSize === ScreenSizeEnum.SM) {
      this.flgSticky = false;
      this.displayedColumns = ['chan_id', 'alias', 'events', 'total_amount'];
    } else if (this.screenSize === ScreenSizeEnum.MD) {
      this.flgSticky = false;
      this.displayedColumns = ['chan_id', 'alias', 'events', 'total_amount'];
    } else {
      this.flgSticky = true;
      this.displayedColumns = ['chan_id', 'alias', 'events', 'total_amount'];
    }
  }

  ngOnInit() {
    this.store.select('lnd').
      pipe(takeUntil(this.unSubs[0])).
      subscribe((rtlStore) => {
        this.errorMessage = '';
        this.apisCallStatus = rtlStore.apisCallStatus;
        if (rtlStore.apisCallStatus.GetForwardingHistory.status === APICallStatusEnum.ERROR) {
          this.errorMessage = (typeof (this.apisCallStatus.GetForwardingHistory.message) === 'object') ? JSON.stringify(this.apisCallStatus.GetForwardingHistory.message) : this.apisCallStatus.GetForwardingHistory.message;
        }
        if (rtlStore.forwardingHistory && rtlStore.forwardingHistory.forwarding_events) {
          this.routingPeersData = rtlStore.forwardingHistory.forwarding_events;
        } else {
          this.routingPeersData = [];
        }
        if (this.routingPeersData.length > 0 && this.sortIn && this.paginatorIn && this.sortOut && this.paginatorOut) {
          this.loadRoutingPeersTable(this.routingPeersData);
        }
        this.logger.info(rtlStore);
      });
  }

  onRoutingPeerClick(selRPeer: RoutingPeers, event: any, direction: string) {
    let alertTitle = ' Routing Information';
    if (direction === 'in') {
      alertTitle = 'Incoming' + alertTitle;
    } else {
      alertTitle = 'Outgoing' + alertTitle;
    }
    const reorderedRoutingPeer = [
      [{ key: 'chan_id', value: selRPeer.chan_id, title: 'Channel ID', width: 50, type: DataTypeEnum.STRING },
        { key: 'alias', value: selRPeer.alias, title: 'Peer Alias', width: 50, type: DataTypeEnum.STRING }],
      [{ key: 'events', value: selRPeer.events, title: 'Events', width: 50, type: DataTypeEnum.NUMBER },
        { key: 'total_amount', value: selRPeer.total_amount, title: 'Total Amount (Sats)', width: 50, type: DataTypeEnum.NUMBER }]
    ];
    this.store.dispatch(new RTLActions.OpenAlert({ data: {
      type: AlertTypeEnum.INFORMATION,
      alertTitle: alertTitle,
      message: reorderedRoutingPeer
    } }));
  }

  loadRoutingPeersTable(forwardingEvents: ForwardingEvent[]) {
    this.filterIn = '';
    this.filterOut = '';
    if (forwardingEvents.length > 0) {
      const results = this.groupRoutingPeers(forwardingEvents);
      this.RoutingPeersIncoming = new MatTableDataSource<RoutingPeers>(results[0]);
      this.RoutingPeersIncoming.sort = this.sortIn;
      this.RoutingPeersIncoming.filterPredicate = (rpIn: RoutingPeers, fltr: string) => JSON.stringify(rpIn).toLowerCase().includes(fltr);
      this.RoutingPeersIncoming.paginator = this.paginatorIn;
      this.logger.info(this.RoutingPeersIncoming);
      this.RoutingPeersOutgoing = new MatTableDataSource<RoutingPeers>(results[1]);
      this.RoutingPeersOutgoing.sort = this.sortOut;
      this.RoutingPeersOutgoing.filterPredicate = (rpOut: RoutingPeers, fltr: string) => JSON.stringify(rpOut).toLowerCase().includes(fltr);
      this.RoutingPeersOutgoing.paginator = this.paginatorOut;
      this.logger.info(this.RoutingPeersOutgoing);
    } else {
      // To reset table after other Forwarding history calls
      this.RoutingPeersIncoming = new MatTableDataSource<RoutingPeers>([]);
      this.RoutingPeersOutgoing = new MatTableDataSource<RoutingPeers>([]);
    }
  }

  groupRoutingPeers(forwardingEvents: ForwardingEvent[]) {
    const incomingResults = [];
    const outgoingResults = [];
    forwardingEvents.forEach((event) => {
      const incoming = incomingResults.find((result) => result.chan_id === event.chan_id_in);
      const outgoing = outgoingResults.find((result) => result.chan_id === event.chan_id_out);
      if (!incoming) {
        incomingResults.push({ chan_id: event.chan_id_in, alias: event.alias_in, events: 1, total_amount: +event.amt_in });
      } else {
        incoming.events++;
        incoming.total_amount = +incoming.total_amount + +event.amt_in;
      }
      if (!outgoing) {
        outgoingResults.push({ chan_id: event.chan_id_out, alias: event.alias_out, events: 1, total_amount: +event.amt_out });
      } else {
        outgoing.events++;
        outgoing.total_amount = +outgoing.total_amount + +event.amt_out;
      }
    });
    return [this.commonService.sortDescByKey(incomingResults, 'total_amount'), this.commonService.sortDescByKey(outgoingResults, 'total_amount')];
  }

  applyIncomingFilter(selFilter: any) {
    this.RoutingPeersIncoming.filter = selFilter.value.trim().toLowerCase();
  }

  applyOutgoingFilter(selFilter: any) {
    this.RoutingPeersOutgoing.filter = selFilter.value.trim().toLowerCase();
  }

  ngOnDestroy() {
    this.unSubs.forEach((completeSub) => {
      completeSub.next(null);
      completeSub.complete();
    });
  }

}
