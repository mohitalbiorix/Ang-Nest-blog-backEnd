import {
  Controller,
  Body,
  Post,
  Param,
  Get,
  Delete,
  Put,
  UseGuards,
  Query,
} from '@nestjs/common';
import { UserService } from '../service/user.service';
import { Observable, catchError, map, of } from 'rxjs';
import { User, UserRole } from '../models/user.model';
import { hasRoles } from 'src/auth/decorators/roles.decorator';
import { JWTAuthGuard } from 'src/auth/guards/jwt-guard';
import { RolesGuard } from 'src/auth/guards/roles.guard';
import { GetUser } from 'src/auth/guards/getUser.guard';
import { Pagination } from 'nestjs-typeorm-paginate';

@Controller('api/users')
export class UserController {
  constructor(private userService: UserService) {}

  // Create user or user registration
  @Post()
  create(@Body() user: User): Observable<User | Object> {
    return this.userService.create(user).pipe(
      map((user: User) => user),
      catchError((err) => of({ error: err.message })),
    );
  }

  // Get user by id
  @Get(':id')
  findOne(@Param() params): Observable<User> {
    return this.userService.findOne(params.id);
  }

  // Get all registered users.
  @Get()
  findAll(
    @Query('page') page: number = 1,
    @Query('limit') limit: number = 10,
    @Query('username') username: string,
  ): Observable<Pagination<User>> {
    limit = limit > 100 ? 100 : limit;
    if (username === null || username === undefined) {
      return this.userService.paginate({
        page: Number(page),
        limit: Number(limit),
        route: 'http://localhost:3000/api/users',
      });
    } else {
      return this.userService.paginateFilterByUsername(
        {
          page: Number(page),
          limit: Number(limit),
          route: 'http://localhost:3000/api/users',
        },
        { username },
      );
    }
  }

  // Find user by mail
  @Post('email')
  findByEmail(@Body() user: User): Observable<User> {
    return this.userService.findByMail(user.email);
  }

  // Delete user by id
  @hasRoles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Delete(':id')
  deleteOne(@Param('id') id: string): Observable<any> {
    return this.userService.deleteOne(Number(id));
  }

  // Update user by id
  @UseGuards(JWTAuthGuard, GetUser)
  @Put(':id')
  updateOne(@Param('id') id: string, @Body() user: User) {
    return this.userService.updateOne(Number(id), user);
  }

  // Update role of user
  @hasRoles(UserRole.ADMIN)
  @UseGuards(JWTAuthGuard, RolesGuard)
  @Put(':id/role')
  updateRoleOfUser(
    @Param('id') id: string,
    @Body() user: User,
  ): Observable<User> {
    return this.userService.updateRoleOfUser(Number(id), user);
  }

  // login user
  @Post('login')
  login(@Body() user: User): Observable<Object> {
    return this.userService.login(user).pipe(
      map((jwt: string) => {
        return { access_token: jwt };
      }),
      catchError((err) => of({ error: err.message })),
    );
  }
}
