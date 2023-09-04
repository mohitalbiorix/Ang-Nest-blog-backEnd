import { Injectable } from '@nestjs/common';
import { UserEntity } from '../models/user.entity';
import { InjectRepository } from '@nestjs/typeorm';
import { Like, Repository } from 'typeorm';
import { User, UserRole } from '../models/user.model';
import { Observable, from, throwError } from 'rxjs';
import { catchError, map, switchMap } from 'rxjs/operators';
import { AuthService } from 'src/auth/service/auth.service';
import {
  IPaginationOptions,
  Pagination,
  paginate,
} from 'nestjs-typeorm-paginate';

@Injectable()
export class UserService {
  constructor(
    @InjectRepository(UserEntity)
    private readonly userRepository: Repository<UserEntity>,
    private authService: AuthService,
  ) {}

  // Create or Register user
  create(user: User): Observable<User> {
    return this.authService.hashPasword(user.password).pipe(
      switchMap((passwordHash: string) => {
        const newUser = new UserEntity();
        newUser.name = user.name;
        newUser.username = user.username;
        newUser.email = user.email;
        newUser.password = passwordHash;
        newUser.role = UserRole.USER;

        return from(this.userRepository.save(newUser)).pipe(
          map((user: User) => {
            const { password, ...result } = user;
            return result;
          }),
          catchError((err) => {
            return throwError(() => new Error(err));
          }),
        );
      }),
    );
  }

  // Get all users
  findAll(): Observable<User[]> {
    return from(this.userRepository.find()).pipe(
      map((users: User[]) => {
        users.forEach((user) => {
          delete user.password;
        });
        return users;
      }),
    );
  }

  // Get user by id
  findOne(id: number): Observable<User> {
    return from(this.userRepository.findOne({ where: { id: id } })).pipe(
      map((user: User) => {
        if (user) {
          const { password, ...result } = user;
          return result;
        } else {
          return {};
        }
      }),
      catchError((error) => {
        throw error;
      }),
    );
  }

  // Delete user by id
  deleteOne(id: number): Observable<any> {
    return from(this.userRepository.delete(id)).pipe(
      catchError((error) => {
        throw error;
      }),
    );
  }

  // Update user by id
  updateOne(id: number, user: User): Observable<any> {
    delete user.email;
    delete user.password;
    delete user.role;

    return from(this.userRepository.update(id, user)).pipe(
      switchMap(() => this.findOne(id)),
      catchError((error) => {
        throw error;
      }),
    );
  }

  // Update user role
  updateRoleOfUser(id: number, user: User): Observable<any> {
    return from(this.userRepository.update(id, user));
  }

  // Login user
  login(user: User): Observable<string> {
    return this.validateUser(user.email, user.password).pipe(
      switchMap((user: User) => {
        if (user) {
          return this.authService
            .generateJWT(user)
            .pipe(map((jwt: string) => jwt));
        } else {
          return 'Wrong Credential';
        }
      }),
    );
  }

  // User validation for Login
  validateUser(email: string, password: string): Observable<User> {
    return from(this.findByMail(email)).pipe(
      switchMap((user: User) =>
        this.authService.comparePasswords(password, user.password).pipe(
          map((match: boolean) => {
            if (match) {
              const { password, ...result } = user;
              return result;
            } else {
              throw Error('Wrong Credential');
            }
          }),
        ),
      ),
    );
  }

  // Find user by mail
  findByMail(email: string): Observable<User> {
    return from(this.userRepository.findOne({ where: { email: email } })).pipe(
      map((user: User) => {
        return user ? user : {};
      }),
      catchError((error) => {
        throw error;
      }),
    );
  }

  // Pagination of users list data
  paginate(options: IPaginationOptions): Observable<Pagination<User>> {
    return from(paginate<User>(this.userRepository, options)).pipe(
      map((usersPageable: Pagination<User>) => {
        usersPageable.items.forEach(function (user) {
          delete user.password;
        });
        return usersPageable;
      }),
    );
  }

  // Pagination filter by username
  paginateFilterByUsername(
    options: IPaginationOptions,
    user: User,
  ): Observable<Pagination<User>> {
    console.log(options, 'options');
    return from(
      this.userRepository.findAndCount({
        skip: Number(options.page) * Number(options.limit) || 0,
        take: Number(options.limit) || 10,
        order: { id: 'ASC' },
        select: ['id', 'name', 'username', 'email', 'role'],
        where: [{ username: Like(`%${user.username}%`) }],
      }),
    ).pipe(
      map(([users, totalUsers]) => {
        const usersPageable: Pagination<User> = {
          items: users,
          links: {
            first: options.route + `?limit=${options.limit}`,
            previous: options.route + ``,
            next:
              options.route +
              `?limit=${options.limit}&page=${Number(options.page) + 1}`,
            last:
              options.route +
              `?limit=${options.limit}&page=${Math.ceil(
                totalUsers / Number(options.limit),
              )}`,
          },
          meta: {
            currentPage: Number(options.page),
            itemCount: users.length,
            itemsPerPage: Number(options.limit),
            totalItems: totalUsers,
            totalPages: Math.ceil(totalUsers / Number(options.limit)),
          },
        };
        return usersPageable;
      }),
    );
  }
}
