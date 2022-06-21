/*
 * Copyright Amazon.com, Inc. or its affiliates. All Rights Reserved.
 * SPDX-License-Identifier: MIT-0
 */
import { Injectable } from '@angular/core';
import { HttpRequest, HttpHandler, HttpEvent, HttpInterceptor, HttpResponse, HttpErrorResponse, HttpSentEvent, HttpEventType } from '@angular/common/http';
import { from, Observable } from 'rxjs';
import { Auth } from 'aws-amplify';
import { filter, map, switchMap } from 'rxjs/operators';

@Injectable()
export class AuthInterceptor implements HttpInterceptor {
  constructor() {}
  idToken: string;

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {

    if (req.url.includes('auth-info')) {
      return next.handle(req).pipe(
        map((event: HttpEvent<any>) => {
          if (event instanceof HttpResponse) {
            if (event.status === 200) {
              event.headers.set('Access-Control-Allow-Origin', '*');
            }
            return event;
          }
        })
      );
    }

    const s = Auth.currentSession().catch((err) => console.log(err));
    const session$ = from(s);

    const idToken$ = session$.pipe(
      filter((sesh) => !!sesh),
      map((sesh) => sesh && sesh.getIdToken())
    );

    return idToken$.pipe(
      switchMap((tok) => {
        const jwt = tok.getJwtToken();
        const apiKey = tok.payload['custom:api-key'];
        req = req.clone({
          headers: req.headers.set('Authorization', 'Bearer ' + jwt)
                              .set('X-API-KEY', apiKey),
        });
        return next.handle(req).pipe(
          map((event: HttpEvent<any>) => {
              if (event.type === HttpEventType.Response) {
                event = event.clone({
                  headers: event.headers.set('Access-Control-Allow-Origin', '*')
                });
                return event;
            }
          })
        );
      })
    );
  }
}
