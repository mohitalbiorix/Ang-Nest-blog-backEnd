import { Injectable } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { Observable, from } from 'rxjs';
import { User } from 'src/user/models/user.model';
const bcrypt = require('bcrypt');

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  // Generate jwt token
  generateJWT(user: User): Observable<string> {
    return from(this.jwtService.signAsync({ user }));
  }

  // Password hashing
  hashPasword(password: string): Observable<string> {
    return from<string>(bcrypt.hash(password, 12));
  }

  // Compare two passwords
  comparePasswords(newPassword: string, passwortHash: string): Observable<any> {
    return from(bcrypt.compare(newPassword, passwortHash));
  }
}
