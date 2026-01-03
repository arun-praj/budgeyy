CREATE TABLE "itinerary_checklists" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_itinerary_id" uuid NOT NULL,
	"user_id" text,
	"title" text NOT NULL,
	"items" text DEFAULT '[]',
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "itinerary_notes" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_itinerary_id" uuid NOT NULL,
	"user_id" text,
	"content" text NOT NULL,
	"is_high_priority" boolean DEFAULT false,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_invites" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_id" uuid NOT NULL,
	"email" text NOT NULL,
	"status" text DEFAULT 'pending',
	"guest_avatar" text,
	"email_notifications_enabled" boolean DEFAULT true NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_transaction_payers" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_transaction_id" uuid NOT NULL,
	"user_id" text,
	"guest_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_transaction_splits" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"trip_transaction_id" uuid NOT NULL,
	"user_id" text,
	"guest_id" uuid,
	"amount" numeric(12, 2) NOT NULL,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "trip_transactions" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"amount" numeric(12, 2) NOT NULL,
	"date" timestamp NOT NULL,
	"description" text,
	"type" "transaction_type" NOT NULL,
	"category_id" uuid,
	"user_id" text NOT NULL,
	"paid_by_user_id" text,
	"paid_by_guest_id" uuid,
	"trip_id" uuid NOT NULL,
	"trip_itinerary_id" uuid NOT NULL,
	"receipt_url" text,
	"product_image_url" text,
	"is_delete" boolean DEFAULT false NOT NULL,
	"deleted_at" timestamp,
	"order" integer DEFAULT 0,
	"created_at" timestamp DEFAULT now() NOT NULL,
	"updated_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "friends" DROP CONSTRAINT "friends_friend_user_id_users_id_fk";
--> statement-breakpoint
ALTER TABLE "trips" ALTER COLUMN "start_date" DROP NOT NULL;--> statement-breakpoint
ALTER TABLE "friends" ADD COLUMN "friend_id" text NOT NULL;--> statement-breakpoint
ALTER TABLE "friends" ADD COLUMN "status" text DEFAULT 'pending';--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "trip_itinerary_id" uuid;--> statement-breakpoint
ALTER TABLE "transactions" ADD COLUMN "order" integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE "trips" ADD COLUMN "notes" text;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "is_guest" boolean DEFAULT false;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "email_notifications_enabled" boolean DEFAULT true NOT NULL;--> statement-breakpoint
ALTER TABLE "itinerary_checklists" ADD CONSTRAINT "itinerary_checklists_trip_itinerary_id_trip_itineraries_id_fk" FOREIGN KEY ("trip_itinerary_id") REFERENCES "public"."trip_itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_checklists" ADD CONSTRAINT "itinerary_checklists_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_notes" ADD CONSTRAINT "itinerary_notes_trip_itinerary_id_trip_itineraries_id_fk" FOREIGN KEY ("trip_itinerary_id") REFERENCES "public"."trip_itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "itinerary_notes" ADD CONSTRAINT "itinerary_notes_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_invites" ADD CONSTRAINT "trip_invites_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction_payers" ADD CONSTRAINT "trip_transaction_payers_trip_transaction_id_trip_transactions_id_fk" FOREIGN KEY ("trip_transaction_id") REFERENCES "public"."trip_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction_payers" ADD CONSTRAINT "trip_transaction_payers_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction_payers" ADD CONSTRAINT "trip_transaction_payers_guest_id_trip_invites_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."trip_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction_splits" ADD CONSTRAINT "trip_transaction_splits_trip_transaction_id_trip_transactions_id_fk" FOREIGN KEY ("trip_transaction_id") REFERENCES "public"."trip_transactions"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction_splits" ADD CONSTRAINT "trip_transaction_splits_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transaction_splits" ADD CONSTRAINT "trip_transaction_splits_guest_id_trip_invites_id_fk" FOREIGN KEY ("guest_id") REFERENCES "public"."trip_invites"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transactions" ADD CONSTRAINT "trip_transactions_category_id_categories_id_fk" FOREIGN KEY ("category_id") REFERENCES "public"."categories"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transactions" ADD CONSTRAINT "trip_transactions_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transactions" ADD CONSTRAINT "trip_transactions_paid_by_user_id_users_id_fk" FOREIGN KEY ("paid_by_user_id") REFERENCES "public"."users"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transactions" ADD CONSTRAINT "trip_transactions_paid_by_guest_id_trip_invites_id_fk" FOREIGN KEY ("paid_by_guest_id") REFERENCES "public"."trip_invites"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transactions" ADD CONSTRAINT "trip_transactions_trip_id_trips_id_fk" FOREIGN KEY ("trip_id") REFERENCES "public"."trips"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "trip_transactions" ADD CONSTRAINT "trip_transactions_trip_itinerary_id_trip_itineraries_id_fk" FOREIGN KEY ("trip_itinerary_id") REFERENCES "public"."trip_itineraries"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" ADD CONSTRAINT "friends_friend_id_users_id_fk" FOREIGN KEY ("friend_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "transactions" ADD CONSTRAINT "transactions_trip_itinerary_id_trip_itineraries_id_fk" FOREIGN KEY ("trip_itinerary_id") REFERENCES "public"."trip_itineraries"("id") ON DELETE set null ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "friends" DROP COLUMN "friend_user_id";--> statement-breakpoint
ALTER TABLE "friends" DROP COLUMN "name";--> statement-breakpoint
ALTER TABLE "friends" DROP COLUMN "email";--> statement-breakpoint
ALTER TABLE "friends" DROP COLUMN "updated_at";