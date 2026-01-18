# PHASE 1 IMPLEMENTATION SPECIFICATIONS
## MVP Foundation: Database, Authentication, Session Ownership

**Duration:** 1 Week (5 days)
**Goal:** Production infrastructure - persistence, auth, team support
**Success Criteria:** All endpoints work, sessions persist across restarts, team workspaces functional

---

## 1.1 DATABASE IMPLEMENTATION

### 1.1.1 PostgreSQL Schema

Create file: `apps/api/migrations/001_initial_schema.sql`

```sql
-- Users table
CREATE TABLE "user" (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    email VARCHAR(255) UNIQUE NOT NULL,
    hashed_password VARCHAR(255) NOT NULL,
    full_name VARCHAR(255),
    is_active BOOLEAN DEFAULT true,
    is_superuser BOOLEAN DEFAULT false,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_user_email ON "user"(email);
CREATE INDEX idx_user_created_at ON "user"(created_at);

-- Teams table
CREATE TABLE team (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    owner_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    description TEXT,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_team_owner_id ON team(owner_id);
CREATE INDEX idx_team_created_at ON team(created_at);

-- Team members (for multi-user teams - future)
CREATE TABLE team_member (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL DEFAULT 'analyst',  -- owner, analyst, viewer
    joined_at TIMESTAMP NOT NULL DEFAULT NOW(),
    UNIQUE(team_id, user_id)
);

CREATE INDEX idx_team_member_team_id ON team_member(team_id);
CREATE INDEX idx_team_member_user_id ON team_member(user_id);

-- Sessions table (replaces in-memory SESSIONS dict)
CREATE TABLE session (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES "user"(id) ON DELETE CASCADE,
    team_id UUID NOT NULL REFERENCES team(id) ON DELETE CASCADE,
    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    expires_at TIMESTAMP NOT NULL,
    last_accessed_at TIMESTAMP NOT NULL DEFAULT NOW(),

    -- FEC upload data (JSON)
    uploaded_files JSONB,  -- [{filename, size, upload_date}, ...]
    entries JSONB,  -- Array of JournalEntry objects
    company_name VARCHAR(255),
    years VARCHAR(255),  -- "2021,2022,2023"

    -- Processed results (JSON)
    processed JSONB,  -- {pl_list, balance_list, kpis_list, cashflows, etc.}

    -- Status tracking
    status VARCHAR(50) DEFAULT 'uploading',  -- uploading, processing, complete, error
    error_message TEXT,

    -- Cleanup
    deleted_at TIMESTAMP,  -- Soft delete for audit

    CONSTRAINT valid_expires_at CHECK (expires_at > created_at)
);

CREATE INDEX idx_session_user_id ON session(user_id);
CREATE INDEX idx_session_team_id ON session(team_id);
CREATE INDEX idx_session_expires_at ON session(expires_at);
CREATE INDEX idx_session_created_at ON session(created_at);
CREATE INDEX idx_session_status ON session(status);

-- Reports table (for Phase 2, but schema needed for Phase 1 setup)
CREATE TABLE report (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    session_id UUID NOT NULL REFERENCES session(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES "user"(id),
    team_id UUID NOT NULL REFERENCES team(id),

    title VARCHAR(255),
    sections JSONB,  -- [{id, type, content, order}, ...]
    version INT DEFAULT 1,

    created_at TIMESTAMP NOT NULL DEFAULT NOW(),
    updated_at TIMESTAMP NOT NULL DEFAULT NOW(),

    deleted_at TIMESTAMP
);

CREATE INDEX idx_report_session_id ON report(session_id);
CREATE INDEX idx_report_user_id ON report(user_id);
CREATE INDEX idx_report_team_id ON report(team_id);

-- Audit log table (for tracking changes)
CREATE TABLE audit_log (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES "user"(id),
    entity_type VARCHAR(50),  -- 'session', 'report', 'user', etc.
    entity_id UUID,
    action VARCHAR(50),  -- 'create', 'update', 'delete', 'download'
    details JSONB,
    ip_address VARCHAR(45),
    created_at TIMESTAMP NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_audit_log_user_id ON audit_log(user_id);
CREATE INDEX idx_audit_log_entity ON audit_log(entity_type, entity_id);
CREATE INDEX idx_audit_log_created_at ON audit_log(created_at);
```

### 1.1.2 SQLAlchemy Models

Create file: `apps/api/src/models/user.py`

```python
from sqlalchemy import Column, String, Boolean, DateTime, Index
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from apps.api.config.database import Base


class User(Base):
    __tablename__ = "user"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    email = Column(String(255), unique=True, nullable=False, index=True)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255))
    is_active = Column(Boolean, default=True)
    is_superuser = Column(Boolean, default=False)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    teams = relationship("Team", back_populates="owner")
    sessions = relationship("Session", back_populates="user")
    team_memberships = relationship("TeamMember", back_populates="user")

    def __repr__(self):
        return f"<User {self.email}>"
```

Create file: `apps/api/src/models/team.py`

```python
from sqlalchemy import Column, String, DateTime, ForeignKey, Boolean
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from apps.api.config.database import Base


class Team(Base):
    __tablename__ = "team"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    description = Column(String(500))
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)

    # Relationships
    owner = relationship("User", back_populates="teams")
    members = relationship("TeamMember", back_populates="team", cascade="all, delete-orphan")
    sessions = relationship("Session", back_populates="team")

    def __repr__(self):
        return f"<Team {self.name}>"


class TeamMember(Base):
    __tablename__ = "team_member"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    team_id = Column(UUID(as_uuid=True), ForeignKey("team.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    role = Column(String(50), default="analyst")  # owner, analyst, viewer
    joined_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Relationships
    team = relationship("Team", back_populates="members")
    user = relationship("User", back_populates="team_memberships")

    def __repr__(self):
        return f"<TeamMember {self.user_id} in {self.team_id}>"
```

Create file: `apps/api/src/models/session.py`

```python
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Text, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime, timedelta
import uuid

from apps.api.config.database import Base


class Session(Base):
    __tablename__ = "session"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id", ondelete="CASCADE"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("team.id", ondelete="CASCADE"), nullable=False)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    expires_at = Column(DateTime, nullable=False)
    last_accessed_at = Column(DateTime, nullable=False, default=datetime.utcnow)

    # Upload data
    uploaded_files = Column(JSON, default=[])
    entries = Column(JSON, default=[])
    company_name = Column(String(255))
    years = Column(String(255))  # "2021,2022,2023"

    # Processed results
    processed = Column(JSON)

    # Status
    status = Column(String(50), default="uploading")  # uploading, processing, complete, error
    error_message = Column(Text)

    # Soft delete
    deleted_at = Column(DateTime)

    # Relationships
    user = relationship("User", back_populates="sessions")
    team = relationship("Team", back_populates="sessions")

    def is_expired(self) -> bool:
        """Check if session has expired"""
        return datetime.utcnow() > self.expires_at

    def is_valid(self) -> bool:
        """Check if session is valid (not expired, not deleted)"""
        return not self.is_expired() and self.deleted_at is None

    def update_accessed_at(self):
        """Update last accessed timestamp"""
        self.last_accessed_at = datetime.utcnow()

    def __repr__(self):
        return f"<Session {self.id} for {self.company_name}>"
```

Create file: `apps/api/src/models/report.py`

```python
from sqlalchemy import Column, String, DateTime, ForeignKey, JSON, Integer
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID
from datetime import datetime
import uuid

from apps.api.config.database import Base


class Report(Base):
    __tablename__ = "report"

    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    session_id = Column(UUID(as_uuid=True), ForeignKey("session.id", ondelete="CASCADE"), nullable=False)
    user_id = Column(UUID(as_uuid=True), ForeignKey("user.id"), nullable=False)
    team_id = Column(UUID(as_uuid=True), ForeignKey("team.id"), nullable=False)

    title = Column(String(255))
    sections = Column(JSON, default=[])  # [{id, type, content, order}, ...]
    version = Column(Integer, default=1)

    created_at = Column(DateTime, nullable=False, default=datetime.utcnow)
    updated_at = Column(DateTime, nullable=False, default=datetime.utcnow, onupdate=datetime.utcnow)
    deleted_at = Column(DateTime)

    def __repr__(self):
        return f"<Report {self.id} v{self.version}>"
```

### 1.1.3 Database Configuration

Create file: `apps/api/config/database.py`

```python
import os
from sqlalchemy import create_engine
from sqlalchemy.orm import declarative_base, sessionmaker
from contextlib import contextmanager

# Get DATABASE_URL from environment
DATABASE_URL = os.getenv(
    "DATABASE_URL",
    "postgresql://user:password@localhost:5432/wincap"
)

# Connection pooling
engine = create_engine(
    DATABASE_URL,
    pool_size=10,
    max_overflow=20,
    pool_pre_ping=True,  # Verify connections before using
    echo=False,  # Set to True for SQL debugging
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()


def get_db():
    """Dependency for FastAPI to inject database session"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@contextmanager
def get_db_context():
    """Context manager for database sessions outside of FastAPI"""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


def init_db():
    """Initialize database schema"""
    Base.metadata.create_all(bind=engine)


def drop_db():
    """Drop all tables (for testing only!)"""
    Base.metadata.drop_all(bind=engine)
```

---

## 1.2 USER AUTHENTICATION

### 1.2.1 Password Hashing & JWT Setup

Create file: `apps/api/src/auth/security.py`

```python
from passlib.context import CryptContext
from datetime import datetime, timedelta
from typing import Optional
import jwt
import os

# Password hashing
pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

# JWT configuration
SECRET_KEY = os.getenv("JWT_SECRET_KEY", "dev-secret-key-change-in-production")
ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 60


def hash_password(password: str) -> str:
    """Hash password using bcrypt"""
    return pwd_context.hash(password)


def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password against hash"""
    return pwd_context.verify(plain_password, hashed_password)


def create_access_token(
    data: dict,
    expires_delta: Optional[timedelta] = None
) -> str:
    """Create JWT access token"""
    to_encode = data.copy()

    if expires_delta:
        expire = datetime.utcnow() + expires_delta
    else:
        expire = datetime.utcnow() + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    to_encode.update({"exp": expire})
    encoded_jwt = jwt.encode(to_encode, SECRET_KEY, algorithm=ALGORITHM)
    return encoded_jwt


def decode_token(token: str) -> dict:
    """Decode and verify JWT token"""
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        return payload
    except jwt.ExpiredSignatureError:
        raise ValueError("Token has expired")
    except jwt.InvalidTokenError:
        raise ValueError("Invalid token")
```

Create file: `apps/api/src/auth/schemas.py`

```python
from pydantic import BaseModel, EmailStr, Field
from uuid import UUID
from datetime import datetime
from typing import Optional


class UserRegister(BaseModel):
    email: EmailStr
    password: str = Field(..., min_length=8)
    full_name: Optional[str] = None


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True


class TokenResponse(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse


class CurrentUserResponse(BaseModel):
    id: UUID
    email: str
    full_name: Optional[str]
    is_active: bool
    teams: list = []

    class Config:
        from_attributes = True
```

### 1.2.2 Authentication Dependencies

Create file: `apps/api/src/auth/dependencies.py`

```python
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthCredentials
from sqlalchemy.orm import Session
from apps.api.config.database import get_db
from apps.api.src.models.user import User
from apps.api.src.auth.security import decode_token

security = HTTPBearer()


async def get_current_user(
    credentials: HTTPAuthCredentials = Depends(security),
    db: Session = Depends(get_db)
) -> User:
    """
    Dependency to get current authenticated user from JWT token.
    Used as: current_user: User = Depends(get_current_user)
    """
    token = credentials.credentials

    try:
        payload = decode_token(token)
        user_id = payload.get("sub")
        if user_id is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid token"
            )
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail=str(e)
        )

    # Get user from database
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User is inactive"
        )

    return user


async def get_current_team(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the current user's primary team.
    For now, users have one team (their personal team).
    Later: support multiple teams.
    """
    team = db.query(Team).filter(
        Team.owner_id == current_user.id,
        Team.is_active == True
    ).first()

    if not team:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Team not found"
        )

    return team
```

### 1.2.3 Authentication Endpoints

Create file: `apps/api/src/routes/auth.py`

```python
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from apps.api.config.database import get_db
from apps.api.src.models.user import User
from apps.api.src.models.team import Team
from apps.api.src.auth.schemas import UserRegister, UserLogin, TokenResponse, UserResponse
from apps.api.src.auth.security import (
    hash_password,
    verify_password,
    create_access_token,
    ACCESS_TOKEN_EXPIRE_MINUTES
)

router = APIRouter(prefix="/api/auth", tags=["auth"])


@router.post("/register", response_model=TokenResponse)
async def register(user_data: UserRegister, db: Session = Depends(get_db)):
    """
    Register a new user.

    Creates user account and a personal team.
    """
    # Check if user already exists
    existing_user = db.query(User).filter(User.email == user_data.email).first()
    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered"
        )

    # Create user
    hashed_password = hash_password(user_data.password)
    new_user = User(
        email=user_data.email,
        hashed_password=hashed_password,
        full_name=user_data.full_name
    )
    db.add(new_user)
    db.flush()

    # Create personal team for user
    personal_team = Team(
        name=f"{user_data.full_name or user_data.email}'s Team",
        owner_id=new_user.id,
        description="Personal team"
    )
    db.add(personal_team)
    db.commit()

    # Generate token
    access_token = create_access_token(
        data={"sub": str(new_user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.from_orm(new_user)
    )


@router.post("/login", response_model=TokenResponse)
async def login(credentials: UserLogin, db: Session = Depends(get_db)):
    """
    Login user and return JWT token.
    """
    # Find user
    user = db.query(User).filter(User.email == credentials.email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    # Verify password
    if not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid email or password"
        )

    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User account is inactive"
        )

    # Generate token
    access_token = create_access_token(
        data={"sub": str(user.id)},
        expires_delta=timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)
    )

    return TokenResponse(
        access_token=access_token,
        user=UserResponse.from_orm(user)
    )


@router.get("/me", response_model=UserResponse)
async def get_current_user(current_user: User = Depends(get_current_user)):
    """
    Get current authenticated user info.
    """
    return UserResponse.from_orm(current_user)
```

---

## 1.3 SESSION OWNERSHIP & PERSISTENCE

### 1.3.1 Session Service Layer

Create file: `apps/api/src/services/session_service.py`

```python
from sqlalchemy.orm import Session as DBSession
from uuid import UUID
from datetime import datetime, timedelta
from apps.api.src.models.session import Session
from apps.api.src.models.user import User
from apps.api.src.models.team import Team
from fastapi import HTTPException, status


class SessionService:
    """Service for managing user sessions"""

    @staticmethod
    def create_session(
        user: User,
        team: Team,
        db: DBSession,
        ttl_hours: int = 24
    ) -> Session:
        """Create a new session for user"""
        expires_at = datetime.utcnow() + timedelta(hours=ttl_hours)

        session = Session(
            user_id=user.id,
            team_id=team.id,
            expires_at=expires_at,
            status="uploading"
        )
        db.add(session)
        db.commit()
        db.refresh(session)
        return session

    @staticmethod
    def get_session(session_id: UUID, user: User, db: DBSession) -> Session:
        """
        Get session, verify ownership and validity.
        Raises 404 if not found, expired, or user doesn't own it.
        """
        session = db.query(Session).filter(
            Session.id == session_id,
            Session.user_id == user.id,
            Session.deleted_at.is_(None)
        ).first()

        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )

        if session.is_expired():
            raise HTTPException(
                status_code=status.HTTP_410_GONE,
                detail="Session has expired"
            )

        # Update access time
        session.update_accessed_at()
        db.commit()

        return session

    @staticmethod
    def update_session_data(
        session: Session,
        company_name: str = None,
        uploaded_files: list = None,
        entries: list = None,
        years: str = None,
        db: DBSession = None
    ) -> Session:
        """Update session with FEC data"""
        if company_name:
            session.company_name = company_name
        if uploaded_files:
            session.uploaded_files = uploaded_files
        if entries:
            session.entries = entries
        if years:
            session.years = years

        session.updated_at = datetime.utcnow()
        if db:
            db.commit()

        return session

    @staticmethod
    def mark_processing(session: Session, db: DBSession) -> Session:
        """Mark session as processing"""
        session.status = "processing"
        session.updated_at = datetime.utcnow()
        db.commit()
        return session

    @staticmethod
    def mark_complete(session: Session, processed_data: dict, db: DBSession) -> Session:
        """Mark session as complete with results"""
        session.status = "complete"
        session.processed = processed_data
        session.error_message = None
        session.updated_at = datetime.utcnow()
        db.commit()
        return session

    @staticmethod
    def mark_error(session: Session, error_message: str, db: DBSession) -> Session:
        """Mark session as error"""
        session.status = "error"
        session.error_message = error_message
        session.updated_at = datetime.utcnow()
        db.commit()
        return session

    @staticmethod
    def cleanup_expired_sessions(db: DBSession, ttl_hours: int = 24) -> int:
        """
        Soft-delete expired sessions (don't delete, just mark).
        Returns count of deleted sessions.
        """
        cutoff_time = datetime.utcnow() - timedelta(hours=ttl_hours)
        count = db.query(Session).filter(
            Session.expires_at < cutoff_time,
            Session.deleted_at.is_(None)
        ).update({"deleted_at": datetime.utcnow()})
        db.commit()
        return count
```

### 1.3.2 Updated API Endpoints

Modify file: `apps/api/api.py` - Replace the session authentication logic

```python
from fastapi import APIRouter, Depends, HTTPException, status, UploadFile, File
from sqlalchemy.orm import Session as DBSession
from apps.api.config.database import get_db
from apps.api.src.auth.dependencies import get_current_user, get_current_team
from apps.api.src.models.user import User
from apps.api.src.models.team import Team
from apps.api.src.services.session_service import SessionService
import logging

logger = logging.getLogger(__name__)
router = APIRouter()

# REMOVE: SESSIONS = {}
# REMOVE: SESSIONS_LOCK = threading.Lock()
# REMOVE: verify_api_key dependency


@router.post("/api/upload")
async def upload_fec(
    files: list[UploadFile] = File(...),
    company_name: str = None,
    current_user: User = Depends(get_current_user),
    current_team: Team = Depends(get_current_team),
    db: DBSession = Depends(get_db)
):
    """
    Upload FEC files for a company.
    Creates a new session and stores file information.

    CHANGED:
    - Removed X-API-Key header check
    - Added JWT authentication via current_user
    - Session now tied to user_id and team_id
    - Data stored in PostgreSQL, not in-memory
    """
    try:
        # Create session
        session = SessionService.create_session(
            user=current_user,
            team=current_team,
            db=db
        )

        # Process files...
        uploaded_files_info = []
        all_entries = []
        years = set()

        for file in files:
            # ... existing file processing code ...
            # parser = FECParser()
            # entries = parser.parse(file.file)
            # ... etc ...

            uploaded_files_info.append({
                "filename": file.filename,
                "size": len(file_content),
                "upload_date": datetime.utcnow().isoformat()
            })
            years.add(year_extracted)

        # Update session with data
        SessionService.update_session_data(
            session=session,
            company_name=company_name,
            uploaded_files=uploaded_files_info,
            entries=all_entries,
            years=",".join(sorted(years)),
            db=db
        )

        return {
            "session_id": str(session.id),
            "company_name": session.company_name,
            "files_count": len(files),
            "status": "uploaded"
        }

    except Exception as e:
        logger.error(f"Upload error: {e}")
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.post("/api/process")
async def process_fec(
    session_id: str,
    current_user: User = Depends(get_current_user),
    current_team: Team = Depends(get_current_team),
    db: DBSession = Depends(get_db)
):
    """
    Process FEC data: build statements, calculate KPIs, etc.

    CHANGED:
    - Removed X-API-Key check
    - Uses JWT auth
    - Retrieves session from database
    - Verifies user owns session
    """
    try:
        # Get and verify session
        session = SessionService.get_session(
            session_id=UUID(session_id),
            user=current_user,
            db=db
        )

        # Mark as processing
        SessionService.mark_processing(session, db)

        # Process entries...
        # (existing logic from apps/api/src/engine/)
        pl_builder = PLBuilder(session.entries)
        balance_builder = BalanceBuilder(session.entries)
        kpi_calculator = KPICalculator(pl_builder, balance_builder)

        processed_data = {
            "pl_list": pl_builder.build_multi_year(),
            "balance_list": balance_builder.build_multi_year(),
            "kpis_list": kpi_calculator.calculate_all(),
            # ... etc
        }

        # Mark as complete
        SessionService.mark_complete(session, processed_data, db)

        return {
            "session_id": str(session.id),
            "status": "complete",
            "company_name": session.company_name
        }

    except ValueError as e:
        SessionService.mark_error(session, str(e), db)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=str(e)
        )


@router.get("/api/data/{session_id}")
async def get_session_data(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Get processed data for a session.

    CHANGED:
    - Uses JWT auth
    - Retrieves from database
    - Verifies ownership
    """
    session = SessionService.get_session(
        session_id=UUID(session_id),
        user=current_user,
        db=db
    )

    if session.status != "complete":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Session is still {session.status}"
        )

    # Convert Decimal to float for JSON serialization
    processed = json.loads(json.dumps(session.processed, default=str))

    return {
        "session_id": str(session.id),
        "company_name": session.company_name,
        "status": session.status,
        "created_at": session.created_at,
        "data": processed
    }


@router.get("/api/sessions")
async def list_sessions(
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    List all sessions for current user and team.

    NEW ENDPOINT - allows viewing session history
    """
    sessions = db.query(Session).filter(
        Session.user_id == current_user.id,
        Session.deleted_at.is_(None)
    ).order_by(Session.created_at.desc()).all()

    return {
        "sessions": [
            {
                "id": str(s.id),
                "company_name": s.company_name,
                "status": s.status,
                "created_at": s.created_at,
                "expires_at": s.expires_at
            }
            for s in sessions
        ]
    }


@router.delete("/api/sessions/{session_id}")
async def delete_session(
    session_id: str,
    current_user: User = Depends(get_current_user),
    db: DBSession = Depends(get_db)
):
    """
    Delete (soft delete) a session.

    NEW ENDPOINT
    """
    session = SessionService.get_session(
        session_id=UUID(session_id),
        user=current_user,
        db=db
    )

    session.deleted_at = datetime.utcnow()
    db.commit()

    return {"status": "deleted"}


# Background task for cleanup (in FastAPI lifespan event)
@app.on_event("startup")
async def startup_event():
    """Run cleanup task on startup"""
    # This should run periodically
    # For now, run once on startup
    asyncio.create_task(cleanup_sessions())


async def cleanup_sessions():
    """Background task to clean up expired sessions"""
    from apps.api.config.database import get_db_context

    while True:
        try:
            with get_db_context() as db:
                count = SessionService.cleanup_expired_sessions(db)
                logger.info(f"Cleaned up {count} expired sessions")
        except Exception as e:
            logger.error(f"Cleanup error: {e}")

        # Run cleanup every 1 hour
        await asyncio.sleep(3600)
```

---

## 1.4 FRONTEND AUTHENTICATION

### 1.4.1 Auth Service

Create file: `apps/web/src/services/auth.ts`

```typescript
import { API_BASE_URL } from './api';

interface LoginCredentials {
  email: string;
  password: string;
}

interface RegisterData extends LoginCredentials {
  full_name?: string;
}

interface User {
  id: string;
  email: string;
  full_name?: string;
  is_active: boolean;
  created_at: string;
}

interface AuthToken {
  access_token: string;
  token_type: string;
  user: User;
}

class AuthService {
  private TOKEN_KEY = 'auth_token';
  private USER_KEY = 'current_user';

  /**
   * Register new user
   */
  async register(data: RegisterData): Promise<AuthToken> {
    const response = await fetch(`${API_BASE_URL}/api/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Registration failed');
    }

    const result: AuthToken = await response.json();
    this.setToken(result.access_token);
    this.setUser(result.user);
    return result;
  }

  /**
   * Login user
   */
  async login(credentials: LoginCredentials): Promise<AuthToken> {
    const response = await fetch(`${API_BASE_URL}/api/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(credentials),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(error.detail || 'Login failed');
    }

    const result: AuthToken = await response.json();
    this.setToken(result.access_token);
    this.setUser(result.user);
    return result;
  }

  /**
   * Logout user (clear token and user)
   */
  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
  }

  /**
   * Get stored token
   */
  getToken(): string | null {
    return localStorage.getItem(this.TOKEN_KEY);
  }

  /**
   * Get stored user
   */
  getUser(): User | null {
    const user = localStorage.getItem(this.USER_KEY);
    return user ? JSON.parse(user) : null;
  }

  /**
   * Check if user is authenticated
   */
  isAuthenticated(): boolean {
    return !!this.getToken();
  }

  /**
   * Store token in localStorage
   */
  private setToken(token: string): void {
    localStorage.setItem(this.TOKEN_KEY, token);
  }

  /**
   * Store user in localStorage
   */
  private setUser(user: User): void {
    localStorage.setItem(this.USER_KEY, JSON.stringify(user));
  }
}

export const authService = new AuthService();
```

### 1.4.2 Update API Service

Modify file: `apps/web/src/services/api.ts` - Replace API key with JWT

```typescript
import { authService } from './auth';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

// REMOVE: export const API_KEY = ...
// REMOVE: export const DEFAULT_API_KEY = ...

/**
 * Get headers with JWT token
 */
function getHeaders(contentType: string = 'application/json'): Record<string, string> {
  const token = authService.getToken();

  if (!token) {
    throw new Error('Not authenticated. Please login.');
  }

  return {
    'Content-Type': contentType,
    'Authorization': `Bearer ${token}`,
  };
}

/**
 * Upload FEC files
 */
export async function uploadFEC(files: File[], companyName: string): Promise<{
  session_id: string;
  company_name: string;
  files_count: number;
  status: string;
}> {
  const formData = new FormData();
  files.forEach(file => formData.append('files', file));
  formData.append('company_name', companyName);

  // Don't include Content-Type for FormData (browser will set it with boundary)
  const response = await fetch(`${API_BASE_URL}/api/upload`, {
    method: 'POST',
    headers: { 'Authorization': `Bearer ${authService.getToken()}` },
    body: formData,
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Upload failed');
  }

  return response.json();
}

/**
 * Process FEC (build statements, calculate KPIs)
 */
export async function processFEC(params: {
  session_id: string;
}): Promise<{ session_id: string; status: string; company_name: string }> {
  const response = await fetch(`${API_BASE_URL}/api/process`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify(params),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Processing failed');
  }

  return response.json();
}

/**
 * Get processed data
 */
export async function getData(sessionId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/data/${sessionId}`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    const error = await response.json();
    throw new Error(error.detail || 'Failed to fetch data');
  }

  return response.json();
}

/**
 * List all sessions
 */
export async function listSessions(): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/sessions`, {
    method: 'GET',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to fetch sessions');
  }

  return response.json();
}

/**
 * Delete session
 */
export async function deleteSession(sessionId: string): Promise<any> {
  const response = await fetch(`${API_BASE_URL}/api/sessions/${sessionId}`, {
    method: 'DELETE',
    headers: getHeaders(),
  });

  if (!response.ok) {
    throw new Error('Failed to delete session');
  }

  return response.json();
}

// ... rest of API methods (agent, export, etc.) follow same pattern
```

### 1.4.3 Login Page

Create file: `apps/web/src/pages/LoginPage.tsx`

```typescript
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { authService } from '../services/auth';
import { Button } from '../components/ui/button';
import { Input } from '../components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '../components/ui/card';
import { Alert, AlertDescription } from '../components/ui/alert';

export function LoginPage() {
  const navigate = useNavigate();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setIsLoading(true);

    try {
      await authService.login({ email, password });
      navigate('/');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Login failed');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 py-12 px-4">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>Login to Whisper</CardTitle>
        </CardHeader>
        <CardContent>
          {error && (
            <Alert variant="destructive" className="mb-4">
              <AlertDescription>{error}</AlertDescription>
            </Alert>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label htmlFor="email" className="block text-sm font-medium">
                Email
              </label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <div>
              <label htmlFor="password" className="block text-sm font-medium">
                Password
              </label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                disabled={isLoading}
              />
            </div>

            <Button type="submit" className="w-full" disabled={isLoading}>
              {isLoading ? 'Logging in...' : 'Login'}
            </Button>
          </form>

          <p className="mt-4 text-center text-sm text-gray-600">
            Don't have an account?{' '}
            <Link to="/signup" className="text-blue-600 hover:underline">
              Sign up
            </Link>
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
```

### 1.4.4 Protected Routes

Create file: `apps/web/src/components/ProtectedRoute.tsx`

```typescript
import React from 'react';
import { Navigate } from 'react-router-dom';
import { authService } from '../services/auth';

interface ProtectedRouteProps {
  children: React.ReactNode;
}

export function ProtectedRoute({ children }: ProtectedRouteProps) {
  if (!authService.isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}
```

### 1.4.5 Update App.tsx

Modify file: `apps/web/src/App.tsx` - Add authentication routes

```typescript
import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { authService } from './services/auth';

import { LoginPage } from './pages/LoginPage';
import { SignupPage } from './pages/SignupPage';
import { DashboardPage } from './pages/DashboardPage';
import { ProtectedRoute } from './components/ProtectedRoute';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/signup" element={<SignupPage />} />

        <Route
          path="/"
          element={
            <ProtectedRoute>
              <DashboardPage />
            </ProtectedRoute>
          }
        />

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
```

---

## 1.5 IMPLEMENTATION ORDER & CHECKLIST

### Day 1: Database Setup
- [ ] Create PostgreSQL database
- [ ] Create migration file: `001_initial_schema.sql`
- [ ] Run migrations
- [ ] Create SQLAlchemy models (user.py, team.py, session.py, report.py)
- [ ] Create database.py config with connection pooling
- [ ] Test database connection

**Verify:** Can connect to DB, tables created, can insert/query data

### Day 2: Backend Authentication
- [ ] Create auth/security.py (password hashing, JWT)
- [ ] Create auth/schemas.py (Pydantic models)
- [ ] Create auth/dependencies.py (FastAPI dependencies)
- [ ] Create routes/auth.py (register, login, me endpoints)
- [ ] Update api.py imports to use new models
- [ ] Update config/settings.py to add JWT_SECRET_KEY
- [ ] Test: Register user → Get token → Use token in requests

**Verify:**
- `POST /api/auth/register` creates user + personal team
- `POST /api/auth/login` returns JWT token
- `GET /api/auth/me` requires valid token
- Invalid tokens rejected with 401

### Day 3: Backend Session Migration
- [ ] Create services/session_service.py
- [ ] Update api.py `/upload` endpoint (use SessionService, JWT auth)
- [ ] Update api.py `/process` endpoint (use SessionService, JWT auth)
- [ ] Update api.py `/data/{id}` endpoint (use SessionService, JWT auth)
- [ ] Create cleanup background task
- [ ] Remove old SESSIONS dict and SESSIONS_LOCK
- [ ] Remove verify_api_key dependency

**Verify:**
- Sessions stored in PostgreSQL
- User can only access own sessions
- Sessions expire correctly
- Background cleanup works

### Day 4: Frontend Authentication
- [ ] Create services/auth.ts
- [ ] Update services/api.ts to use JWT instead of API key
- [ ] Create pages/LoginPage.tsx
- [ ] Create pages/SignupPage.tsx
- [ ] Create components/ProtectedRoute.tsx
- [ ] Update App.tsx with auth routes

**Verify:**
- Can register new user
- Can login
- Token stored in localStorage
- Protected routes redirect to login
- All API calls include JWT token

### Day 5: Integration Testing & Fixes
- [ ] End-to-end test: Register → Login → Upload → Process
- [ ] Verify no X-API-Key headers in requests (only Bearer token)
- [ ] Test session persistence across server restart
- [ ] Test session expiration
- [ ] Test multi-user scenarios
- [ ] Test error handling (invalid token, expired session, permission denied)
- [ ] Fix any bugs discovered

**Verify:**
- Full workflow functional
- Sessions persist in DB
- Auth working end-to-end
- No regressions in financial calculations

---

## 1.6 DATABASE ENVIRONMENT SETUP

### .env File Updates

Add to `.env`:

```env
# Database
DATABASE_URL=postgresql://wincap_user:secure_password@localhost:5432/wincap

# JWT
JWT_SECRET_KEY=your-super-secret-key-change-in-production

# Session TTL (hours)
SESSION_TTL_HOURS=24
CLEANUP_INTERVAL_HOURS=1

# API
API_HOST=0.0.0.0
API_PORT=8000
ENVIRONMENT=production
```

### Docker Compose for PostgreSQL

Update `docker-compose.yml`:

```yaml
version: '3.8'

services:
  postgres:
    image: postgres:16-alpine
    environment:
      POSTGRES_USER: wincap_user
      POSTGRES_PASSWORD: secure_password
      POSTGRES_DB: wincap
    ports:
      - "5432:5432"
    volumes:
      - postgres_data:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U wincap_user"]
      interval: 10s
      timeout: 5s
      retries: 5

  api:
    build: ./apps/api
    environment:
      DATABASE_URL: postgresql://wincap_user:secure_password@postgres:5432/wincap
      JWT_SECRET_KEY: dev-secret-key
      ENVIRONMENT: development
    ports:
      - "8000:8000"
    depends_on:
      postgres:
        condition: service_healthy
    volumes:
      - ./apps/api:/app

  web:
    build: ./apps/web
    environment:
      VITE_API_URL: http://localhost:8000
    ports:
      - "5173:5173"
    depends_on:
      - api
    volumes:
      - ./apps/web:/app

volumes:
  postgres_data:
```

---

## 1.7 TESTING STRATEGY

### Backend Tests

Create file: `apps/api/tests/test_auth.py`

```python
import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from apps.api.main import app
from apps.api.config.database import Base, get_db


@pytest.fixture
def test_db():
    """In-memory SQLite database for tests"""
    engine = create_engine("sqlite:///:memory:")
    Base.metadata.create_all(bind=engine)
    TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

    def override_get_db():
        db = TestingSessionLocal()
        try:
            yield db
        finally:
            db.close()

    app.dependency_overrides[get_db] = override_get_db
    yield TestingSessionLocal()
    app.dependency_overrides.clear()


def test_register_user(test_db):
    """Test user registration"""
    client = TestClient(app)

    response = client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
        "full_name": "Test User"
    })

    assert response.status_code == 200
    data = response.json()
    assert "access_token" in data
    assert data["user"]["email"] == "test@example.com"


def test_login_user(test_db):
    """Test user login"""
    client = TestClient(app)

    # Register first
    client.post("/api/auth/register", json={
        "email": "test@example.com",
        "password": "securepassword123",
    })

    # Login
    response = client.post("/api/auth/login", json={
        "email": "test@example.com",
        "password": "securepassword123"
    })

    assert response.status_code == 200
    assert "access_token" in response.json()


def test_protected_endpoint_without_token():
    """Test that protected endpoints require token"""
    client = TestClient(app)

    response = client.get("/api/sessions")
    assert response.status_code == 403  # Forbidden without token


def test_protected_endpoint_with_token():
    """Test that protected endpoints work with valid token"""
    # TODO: Implementation
    pass
```

### Frontend Tests

Create file: `apps/web/src/__tests__/auth.test.ts`

```typescript
import { describe, it, expect, beforeEach } from 'vitest';
import { authService } from '../services/auth';

describe('Auth Service', () => {
  beforeEach(() => {
    localStorage.clear();
  });

  it('should store token after login', () => {
    const token = 'test-token-123';
    authService.setToken(token);
    expect(authService.getToken()).toBe(token);
  });

  it('should clear token on logout', () => {
    authService.setToken('test-token');
    authService.logout();
    expect(authService.getToken()).toBeNull();
  });

  it('should know when user is authenticated', () => {
    expect(authService.isAuthenticated()).toBe(false);
    authService.setToken('test-token');
    expect(authService.isAuthenticated()).toBe(true);
  });
});
```

---

## 1.8 MIGRATION GUIDE

### For Existing Users / Data

Since this is a greenfield database setup, migration is straightforward:

1. **Backup existing in-memory data** (if any)
   - Export sessions to JSON files
   - Store in backup directory

2. **Create fresh database**
   - Run migrations
   - Create default team for "demo" user if needed

3. **Update all API calls**
   - Remove X-API-Key headers
   - Add JWT Bearer tokens
   - Update frontend to use auth service

4. **Test thoroughly**
   - Upload files
   - Process
   - Export
   - All features should work

---

## 1.9 SUCCESS METRICS

**Phase 1 is complete when:**

✅ **Database**
- PostgreSQL running with schema
- Connection pooling working
- Queries returning data correctly

✅ **Authentication**
- User registration endpoint works
- Login returns valid JWT
- Token validation working
- Protected endpoints require token

✅ **Session Management**
- Sessions created in database
- Sessions retrieved for authorized users
- Sessions expire correctly
- Cleanup task removes expired sessions

✅ **API Integration**
- All endpoints use JWT (no X-API-Key)
- All endpoints verify user ownership
- Session data persists across restart

✅ **Frontend**
- Login page functional
- Signup page functional
- Protected routes redirect to login
- API calls include JWT token

✅ **Testing**
- 70%+ backend test coverage for auth endpoints
- 60%+ frontend test coverage for auth flows
- Integration test: Register → Login → Upload → Process

---

## 1.10 ROLLBACK PLAN

If Phase 1 fails during production:

1. **Keep old code branch** - Maintain ability to revert
2. **Dual-run period** - Run both old and new code briefly
3. **Rollback procedure:**
   - Switch back to old API branch
   - Restore in-memory SESSIONS from backup
   - API continues with X-API-Key auth
   - Database kept for data recovery attempt

---

## DEPENDENCY CHECKLIST

**Python packages to add:**

```
fastapi-users>=12.0.0
python-jose[cryptography]>=3.3.0
passlib[bcrypt]>=1.7.4
sqlalchemy>=2.0
psycopg2-binary>=2.9.0
```

**Frontend packages to add:**

```
react-router-dom@latest
```

**Existing packages to verify:**

- sqlalchemy (should be there)
- pydantic (should be there)
- fastapi (should be there)

---

*This specification provides a complete blueprint for Phase 1. Each section is actionable and ready for implementation.*
