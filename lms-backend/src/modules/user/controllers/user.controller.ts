import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';
import { Auth } from '../../../common/decorators/auth.decorator.js';
import { Role } from '../../../common/enums/role.enum.js';
import { PaginatedResult } from '../../../common/types/paginated-result.type.js';
import { CreateManagedUserDto } from '../dto/create-managed-user.dto.js';
import { ListUsersQueryDto } from '../dto/list-users-query.dto.js';
import { UpdateUserDto } from '../dto/update-user.dto.js';
import { UserService } from '../services/user.service.js';
import { ManagedUserView } from '../types/managed-user-view.type.js';

/** Handles user-related HTTP requests (admin user management: students and lecturers). */
@Controller('users')
@Auth(Role.ADMIN)
export class UserController {
  constructor(private readonly userService: UserService) {}

  /** Pre-provisions an account (typically a lecturer) by email. */
  @Post()
  create(@Body() dto: CreateManagedUserDto): Promise<ManagedUserView> {
    return this.userService.createManagedUser(dto);
  }

  /**
   * Paged user list for the student / lecturer management pages and the class form's lecturer dropdown:
   * `?role=&isActive=&hasLoggedIn=&status=&search=&sort=&page=&limit=`.
   */
  @Get()
  list(
    @Query() query: ListUsersQueryDto,
  ): Promise<PaginatedResult<ManagedUserView>> {
    return this.userService.listUsers(query);
  }

  @Get(':id')
  getOne(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedUserView> {
    return this.userService.getManagedUser(id);
  }

  @Patch(':id')
  update(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
  ): Promise<ManagedUserView> {
    return this.userService.updateUser(id, dto);
  }

  /** Soft delete: sets `isActive = false`. There is no DELETE endpoint on purpose. */
  @Patch(':id/deactivate')
  deactivate(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedUserView> {
    return this.userService.deactivateUser(id);
  }

  @Patch(':id/activate')
  activate(@Param('id', ParseUUIDPipe) id: string): Promise<ManagedUserView> {
    return this.userService.activateUser(id);
  }
}
