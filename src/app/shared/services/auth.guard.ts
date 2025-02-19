import { ActivatedRouteSnapshot, CanActivate, Router } from '@angular/router';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

import { SessionService } from './session.service';
import { map } from 'rxjs/operators';

@Injectable()
export class AuthGuard implements CanActivate {

  constructor(private router: Router, private sessionService: SessionService) {}

  canActivate(route: ActivatedRouteSnapshot): boolean | Observable<boolean> | Promise<boolean> {
    if (!this.sessionService.getItem('token')) {
      return false;
    } else if (route.url[0].path !== 'settings' && route.url[0].path !== 'auth' && this.sessionService.getItem('defaultPassword') === 'true') {
      this.router.navigate(['/settings/auth']);
      return false;
    } else {
      return true;
    }
  }

}

@Injectable()
export class LNDUnlockedGuard implements CanActivate {

  constructor(private sessionService: SessionService) {}

  canActivate(): boolean | Observable<boolean> | Promise<boolean> {
    return !!this.sessionService.watchSession().pipe(map((session) => session.lndUnlocked));
  }

}

@Injectable()
export class CLUnlockedGuard implements CanActivate {

  constructor(private sessionService: SessionService) {}

  canActivate(): boolean | Observable<boolean> | Promise<boolean> {
    return !!this.sessionService.watchSession().pipe(map((session) => session.clUnlocked));
  }

}

@Injectable()
export class ECLUnlockedGuard implements CanActivate {

  constructor(private sessionService: SessionService) {}

  canActivate(): boolean | Observable<boolean> | Promise<boolean> {
    return !!this.sessionService.watchSession().pipe(map((session) => session.eclUnlocked));
  }

}
