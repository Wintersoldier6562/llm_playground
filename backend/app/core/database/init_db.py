"""Initialize the database with tables."""
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy import text

async def init_db(session: AsyncSession) -> None:

    # TODO: Setup database migrations
    """Initialize the database with tables."""
    # Enable UUID extension
    await session.execute(text('CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'))
    
    # Create users table
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS users (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            email TEXT UNIQUE NOT NULL,
            hashed_password TEXT NOT NULL,
            full_name TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
    """))
    
    # Create prompts table
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS prompts (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            content TEXT NOT NULL,
            user_id UUID NOT NULL REFERENCES users(id),
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """))
    
    # Create model_responses table
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS model_responses (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            prompt_id UUID NOT NULL REFERENCES prompts(id),
            model_name TEXT NOT NULL,
            content TEXT NOT NULL,
            prompt_tokens INTEGER NOT NULL,
            completion_tokens INTEGER NOT NULL,
            total_tokens INTEGER NOT NULL,
            cost FLOAT NOT NULL,
            latency FLOAT NOT NULL,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """))
    
    # Create chat_sessions table
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS chat_sessions (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            user_id UUID NOT NULL REFERENCES users(id),
            provider TEXT NOT NULL,
            model TEXT NOT NULL,
            title TEXT,
            is_active BOOLEAN DEFAULT TRUE,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP WITH TIME ZONE
        );
    """))
    
    # Create chat_messages table
    await session.execute(text("""
        CREATE TABLE IF NOT EXISTS chat_messages (
            id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
            session_id UUID NOT NULL REFERENCES chat_sessions(id),
            role TEXT NOT NULL,
            content TEXT NOT NULL,
            prompt_tokens INTEGER,
            completion_tokens INTEGER,
            total_tokens INTEGER,
            cost FLOAT,
            latency FLOAT,
            created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
        );
    """))
    
    # Create indexes
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_users_id ON users(id);'))
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_users_email ON users(email);'))
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_prompts_id ON prompts(id);'))
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_model_responses_id ON model_responses(id);'))
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_chat_sessions_id ON chat_sessions(id);'))
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_chat_sessions_user_id ON chat_sessions(user_id);'))
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_chat_messages_id ON chat_messages(id);'))
    await session.execute(text('CREATE INDEX IF NOT EXISTS ix_chat_messages_session_id ON chat_messages(session_id);'))
    
    await session.commit() 