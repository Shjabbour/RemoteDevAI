# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-01-XX

### Added

#### Screen Capture
- `capture_screenshot` - Capture full screen or specific display
- `capture_region` - Capture specific screen region
- `list_displays` - List available displays
- `capture_all_displays` - Capture all displays simultaneously
- `capture_to_file` - Save screenshot directly to file

#### Screen Recording
- `start_recording` - Start screen recording with configurable quality
- `stop_recording` - Stop and save recording
- `get_recording_status` - Check recording status
- `pause_recording` - Pause current recording
- `cancel_recording` - Cancel without saving

#### Browser Automation
- `open_browser` - Launch and navigate browser
- `click_element` - Click elements by selector
- `type_text` - Type into form fields
- `take_screenshot` - Screenshot browser page
- `record_browser` - Record browser session
- `close_browser` - Close browser
- `navigate` - Navigate to URL
- `get_page_content` - Get page HTML and text
- `execute_javascript` - Run scripts in page
- `fill_form_fields` - Fill multiple form fields
- `get_element_text_content` - Get element text

#### Terminal Capture
- `capture_terminal` - Screenshot terminal
- `record_terminal` - Record terminal session
- `get_terminal_output` - Get recent output
- `stop_terminal_recording` - Stop terminal recording
- `list_terminal_sessions` - List active sessions

#### File Preview
- `preview_file` - Preview images and text files
- `preview_diff` - Generate file diffs
- `preview_directory` - Visualize directory tree
- `get_file_metadata` - Get file information

#### Notifications
- `send_notification` - Send push notification
- `send_progress` - Send progress update
- `request_feedback` - Request user input
- `cancel_feedback_request` - Cancel feedback request
- `send_webhook` - Send webhook notification
- `send_batch_notifications` - Send multiple notifications

#### Video Tools
- `compress_video` - Compress video files
- `create_thumbnail` - Extract video frames
- `trim_video` - Trim video segments
- `add_timestamp` - Add timestamp overlay
- `convert_video_format` - Convert video formats
- `merge_videos` - Merge multiple videos
- `extract_video_audio` - Extract audio track
- `get_video_info` - Get video metadata

#### Code Runner
- `run_code` - Execute code in sandbox
- `run_tests` - Run test suites
- `run_build` - Execute build commands
- `get_output` - Get execution output
- `install_deps` - Install dependencies
- `lint_code` - Run linter
- `format_code` - Format code
- `check_runtime` - Check runtime availability
- `type_check` - Run type checking

#### Utilities
- FFmpeg wrapper with quality presets
- Playwright browser automation utilities
- Sandbox code execution
- Error handling and logging
- TypeScript type definitions

### Configuration
- MCP server configuration via JSON
- Environment variable support
- Security settings
- Storage management
- Logging configuration

### Documentation
- Comprehensive README
- API documentation
- Usage examples
- Configuration guide
- Security guidelines

## [Unreleased]

### Planned Features
- Mobile device control
- Database query tools
- API testing tools
- Performance monitoring
- Log analysis tools
- Container management
- Cloud service integration
- Git operations
- File system operations
- Network utilities
