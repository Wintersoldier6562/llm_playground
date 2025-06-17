"""Database migration utilities."""
import asyncio
from alembic.config import Config
from alembic import command
from app.core.config import settings
from sqlalchemy.exc import ProgrammingError

async def run_migrations() -> None:
    """Run database migrations on startup."""
    try:
        # Create Alembic configuration
        alembic_cfg = Config("alembic.ini")
        
        # Override the database URL with the one from settings
        alembic_cfg.set_main_option("sqlalchemy.url", str(settings.SQLALCHEMY_DATABASE_URI))
        
        # Run the migration
        def run_upgrade():
            print("Running migrations")
            try:
                command.revision(alembic_cfg, "auto migration", autogenerate=True)
                command.upgrade(alembic_cfg, "head")
            except Exception as e:
                print(f"Unexpected error during migration: {str(e)}")
                raise
        
        # Run in a thread pool since Alembic's command functions are synchronous
        await asyncio.get_event_loop().run_in_executor(None, run_upgrade)
        print("Database migrations completed successfully", flush=True)
    except Exception as e:
        print(f"Error running database migrations: {e}")
        raise